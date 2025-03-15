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
  getPosts(filter?: { status?: string }): Promise<MonitoredPost[]>;
  addPost(post: InsertPost): Promise<MonitoredPost>;
  updatePostStatus(id: number, status: string): Promise<void>;

  // Config management
  getConfig(): Promise<Config>;
  updateConfig(config: Config): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private config: Config = {
    scoreThreshold: 7,
    checkFrequency: 60,
    openAiPrompt: "You are an assistant analyzing Reddit content for AI-related sentiment. Rate the relevance and negativity from 1-10, where 10 indicates high relevance and strong negative sentiment about AI. Provide analysis and a suggested reply.",
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

  async getPosts(filter?: { status?: string }): Promise<MonitoredPost[]> {
    let query = db.select().from(monitoredPosts);
    if (filter?.status) {
      query = query.where(eq(monitoredPosts.status, filter.status));
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

  async getConfig(): Promise<Config> {
    return this.config;
  }

  async updateConfig(config: Config): Promise<void> {
    this.config = config;
  }
}

export const storage = new DatabaseStorage();