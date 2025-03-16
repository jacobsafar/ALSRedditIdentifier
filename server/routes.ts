import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RedditClient } from "./reddit";
import { analyzeContent } from "./openai";
import { insertSubredditSchema, insertPostSchema, configSchema } from "@shared/schema";

let redditClient: RedditClient;
try {
  redditClient = new RedditClient();
} catch (error) {
  console.error("Failed to initialize Reddit client:", error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Subreddit management
  app.get("/api/subreddits", async (_req, res) => {
    const subreddits = await storage.getSubreddits();
    res.json(subreddits);
  });

  app.post("/api/subreddits", async (req, res) => {
    const parsed = insertSubredditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid subreddit data" });
      return;
    }

    // Remove 'r/' prefix if present and trim whitespace
    const subredditName = parsed.data.name.replace(/^r\//, '').trim();

    try {
      const subreddit = await storage.addSubreddit({
        ...parsed.data,
        name: subredditName
      });
      res.json(subreddit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.delete("/api/subreddits/:id", async (req, res) => {
    try {
      await storage.removeSubreddit(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.patch("/api/subreddits/:id/status", async (req, res) => {
    try {
      const { isActive } = req.body;
      await storage.updateSubredditStatus(Number(req.params.id), isActive);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Post management
  app.get("/api/posts", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const posts = await storage.getPosts({ status });
      res.json(posts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.patch("/api/posts/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updatePostStatus(Number(req.params.id), status);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.delete("/api/posts", async (_req, res) => {
    try {
      await storage.clearAllPosts();
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.patch("/api/posts/ignore-all", async (_req, res) => {
    try {
      await storage.ignoreAllPendingPosts();
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Config management
  app.get("/api/config", async (_req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.put("/api/config", async (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid configuration" });
      return;
    }

    try {
      await storage.updateConfig(parsed.data);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Reddit content fetching
  app.post("/api/fetch", async (_req, res) => {
    if (!redditClient) {
      res.status(500).json({ error: "Reddit client not initialized. Check your API credentials." });
      return;
    }

    try {
      const subreddits = await storage.getSubreddits();
      const config = await storage.getConfig();

      if (subreddits.length === 0) {
        res.status(400).json({ error: "No subreddits configured. Please add at least one subreddit in settings." });
        return;
      }

      console.log(`Fetching content from ${subreddits.length} subreddits`);
      let totalProcessed = 0;
      let totalAnalyzed = 0;
      const errors: string[] = [];

      for (const subreddit of subreddits) {
        if (!subreddit.isActive) continue;
        console.log(`Processing subreddit: r/${subreddit.name}`);

        try {
          // Fetch posts and comments
          const posts = await redditClient.getNewPosts(subreddit.name, config.postsPerFetch);
          console.log(`Found ${posts.length} posts in r/${subreddit.name}`);
          const comments = await redditClient.getNewComments(subreddit.name, config.postsPerFetch);
          console.log(`Found ${comments.length} comments in r/${subreddit.name}`);

          // Get existing post IDs to avoid duplicates
          const existingPostIds = await storage.getProcessedPostIds();
          const allContent = [...posts, ...comments];
          const newContent = allContent.filter(content => !existingPostIds.includes(content.postId));

          console.log(`Found ${newContent.length} new items to process out of ${allContent.length} total items`);

          for (const content of newContent) {
            try {
              totalAnalyzed++;
              console.log(`Analyzing content from ${content.author} in r/${subreddit.name}`);
              const analysis = await analyzeContent(
                content.title + "\n" + content.content,
                config.openAiPrompt
              );

              console.log(`Content analysis score: ${analysis.score}, threshold: ${config.scoreThreshold}`);
              if (analysis.score >= config.scoreThreshold) {
                const post = {
                  ...content,
                  score: analysis.score,
                  analysis: analysis,
                  suggestedReply: analysis.suggestedReply,
                  status: "pending"
                };

                await storage.addPost(post);
                totalProcessed++;
                console.log(`Added post with score ${analysis.score}`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push(`Failed to analyze content: ${errorMessage}`);
              console.error(`Analysis error: ${errorMessage}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to fetch from r/${subreddit.name}: ${errorMessage}`);
          console.error(`Subreddit fetch error: ${errorMessage}`);
        }
      }

      if (errors.length > 0) {
        res.status(207).json({
          message: `Processed ${totalProcessed} out of ${totalAnalyzed} items`,
          summary: `Found ${totalProcessed} new relevant items above threshold`,
          errors
        });
      } else {
        res.status(200).json({
          message: `Successfully processed ${totalProcessed} out of ${totalAnalyzed} items`,
          summary: `Found ${totalProcessed} new relevant items above threshold`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`General fetch error: ${errorMessage}`);
      res.status(500).json({ error: errorMessage });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}