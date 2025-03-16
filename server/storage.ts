import { MonitoredPost, MonitoredSubreddit, InsertPost, InsertSubreddit, Config, monitoredSubreddits, monitoredPosts } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Subreddit management
  getSubreddits(): Promise<MonitoredSubreddit[]>;
  addSubreddit(subreddit: InsertSubreddit): Promise<MonitoredSubreddit>;
  removeSubreddit(id: number): Promise<void>;
  updateSubredditStatus(id: number, isActive: number): Promise<void>;

  // Post management
  getPosts(filter?: { status?: string; id?: number }): Promise<MonitoredPost[]>;
  addPost(post: InsertPost): Promise<MonitoredPost>;
  updatePostStatus(id: number, status: string): Promise<void>;
  clearAllPosts(): Promise<void>;
  ignoreAllPendingPosts(): Promise<void>;
  updatePostAnalysis(id: number, analysis: { score: number; analysis: any; suggestedReply: string }): Promise<void>;

  // Config management
  getConfig(): Promise<Config>;
  updateConfig(config: Config): Promise<void>;
  // Add new method to get all processed post IDs
  getProcessedPostIds(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  private config: Config = {
    scoreThreshold: 7,
    checkFrequency: 60,
    postsPerFetch: 25,
    openAiPrompt: `You are an AI assistant analyzing Reddit content for sentiment about AI technology.
Please analyze the following text and respond with a JSON object containing:
{
  "score": number between 1-10 where 10 indicates high relevance and strong negative sentiment about AI,
  "analysis": a brief explanation of why you gave this score,
  "suggestedReply": a courteous and factual 1-2 sentence reply that addresses their concerns
}`,
  };

  async getSubreddits(): Promise<MonitoredSubreddit[]> {
    return await db.select().from(monitoredSubreddits);
  }

  async addSubreddit(subreddit: InsertSubreddit): Promise<MonitoredSubreddit> {
    const [newSubreddit] = await db
      .insert(monitoredSubreddits)
      .values(subreddit)
      .returning();
    return newSubreddit;
  }

  async removeSubreddit(id: number): Promise<void> {
    await db.delete(monitoredSubreddits).where(eq(monitoredSubreddits.id, id));
  }

  async updateSubredditStatus(id: number, isActive: number): Promise<void> {
    await db
      .update(monitoredSubreddits)
      .set({ isActive })
      .where(eq(monitoredSubreddits.id, id));
  }

  async getPosts(filter?: { status?: string; id?: number }): Promise<MonitoredPost[]> {
    let query = db.select().from(monitoredPosts);
    if (filter?.status) {
      query = query.where(eq(monitoredPosts.status, filter.status));
    }
    if (filter?.id) {
      query = query.where(eq(monitoredPosts.id, filter.id));
    }
    return await query;
  }

  async addPost(post: InsertPost): Promise<MonitoredPost> {
    const [newPost] = await db
      .insert(monitoredPosts)
      .values(post)
      .returning();
    return newPost;
  }

  async updatePostStatus(id: number, status: string): Promise<void> {
    await db
      .update(monitoredPosts)
      .set({ status })
      .where(eq(monitoredPosts.id, id));
  }

  async clearAllPosts(): Promise<void> {
    await db
      .delete(monitoredPosts)
      .where(eq(monitoredPosts.status, "pending"));
  }

  async ignoreAllPendingPosts(): Promise<void> {
    await db
      .update(monitoredPosts)
      .set({ status: "ignored" })
      .where(eq(monitoredPosts.status, "pending"));
  }

  async getConfig(): Promise<Config> {
    return this.config;
  }

  async updateConfig(config: Config): Promise<void> {
    this.config = config;
  }

  async getProcessedPostIds(): Promise<string[]> {
    const posts = await db.select({ postId: monitoredPosts.postId }).from(monitoredPosts);
    return posts.map(post => post.postId);
  }

  async updatePostAnalysis(id: number, analysis: { score: number; analysis: any; suggestedReply: string }): Promise<void> {
    await db
      .update(monitoredPosts)
      .set({
        score: analysis.score,
        analysis: analysis.analysis,
        suggestedReply: analysis.suggestedReply
      })
      .where(eq(monitoredPosts.id, id));
  }
}

export const storage = new DatabaseStorage();