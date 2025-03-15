import Snoowrap from "snoowrap";

export class RedditClient {
  private client: Snoowrap;

  constructor() {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || 
        !process.env.REDDIT_USERNAME || !process.env.REDDIT_PASSWORD) {
      throw new Error("Missing Reddit API credentials. Please check your environment variables.");
    }

    try {
      this.client = new Snoowrap({
        userAgent: "AIBlockMonitor/1.0.0",
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Reddit client: ${errorMessage}`);
    }
  }

  async getNewPosts(subreddit: string, limit = 25) {
    try {
      const posts = await this.client.getSubreddit(subreddit).getNew({ limit });
      return posts.map(post => ({
        postId: post.id,
        subreddit: post.subreddit.display_name,
        author: post.author.name,
        title: post.title,
        content: post.selftext || "",
        url: `https://reddit.com${post.permalink}`,
        timestamp: new Date(post.created_utc * 1000),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch posts from r/${subreddit}: ${errorMessage}`);
    }
  }

  async getNewComments(subreddit: string, limit = 25) {
    try {
      const comments = await this.client.getSubreddit(subreddit).getNewComments({ limit });
      return comments.map(comment => ({
        postId: comment.id,
        subreddit: comment.subreddit.display_name,
        author: comment.author.name,
        title: "",
        content: comment.body,
        url: `https://reddit.com${comment.permalink}`,
        timestamp: new Date(comment.created_utc * 1000),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch comments from r/${subreddit}: ${errorMessage}`);
    }
  }
}
