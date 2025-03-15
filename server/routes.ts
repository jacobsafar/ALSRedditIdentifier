import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RedditClient } from "./reddit";
import { analyzeContent } from "./openai";
import { insertSubredditSchema, insertPostSchema, configSchema } from "@shared/schema";

const redditClient = new RedditClient();

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
    const subreddit = await storage.addSubreddit(parsed.data);
    res.json(subreddit);
  });

  app.delete("/api/subreddits/:id", async (req, res) => {
    await storage.removeSubreddit(Number(req.params.id));
    res.status(204).send();
  });

  app.patch("/api/subreddits/:id/status", async (req, res) => {
    const { isActive } = req.body;
    await storage.updateSubredditStatus(Number(req.params.id), isActive);
    res.status(204).send();
  });

  // Post management
  app.get("/api/posts", async (req, res) => {
    const status = req.query.status as string | undefined;
    const posts = await storage.getPosts({ status });
    res.json(posts);
  });

  app.patch("/api/posts/:id/status", async (req, res) => {
    const { status } = req.body;
    await storage.updatePostStatus(Number(req.params.id), status);
    res.status(204).send();
  });

  // Config management
  app.get("/api/config", async (_req, res) => {
    const config = await storage.getConfig();
    res.json(config);
  });

  app.put("/api/config", async (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid configuration" });
      return;
    }
    await storage.updateConfig(parsed.data);
    res.status(204).send();
  });

  // Reddit content fetching
  app.post("/api/fetch", async (_req, res) => {
    try {
      const subreddits = await storage.getSubreddits();
      const config = await storage.getConfig();

      for (const subreddit of subreddits) {
        if (!subreddit.isActive) continue;

        const posts = await redditClient.getNewPosts(subreddit.name);
        const comments = await redditClient.getNewComments(subreddit.name);

        for (const content of [...posts, ...comments]) {
          const analysis = await analyzeContent(
            content.title + "\n" + content.content,
            config.openAiPrompt
          );

          if (analysis.score >= config.scoreThreshold) {
            const post = {
              ...content,
              score: analysis.score,
              analysis: analysis,
              suggestedReply: analysis.suggestedReply,
              status: "pending"
            };

            await storage.addPost(post);
          }
        }
      }

      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}