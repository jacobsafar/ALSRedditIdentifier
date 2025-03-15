import { MonitoredPost, MonitoredSubreddit, InsertPost, InsertSubreddit, Config } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private subreddits: Map<number, MonitoredSubreddit>;
  private posts: Map<number, MonitoredPost>;
  private config: Config;
  private currentSubredditId: number;
  private currentPostId: number;

  constructor() {
    this.subreddits = new Map();
    this.posts = new Map();
    this.currentSubredditId = 1;
    this.currentPostId = 1;
    this.config = {
      scoreThreshold: 7,
      checkFrequency: 60,
      openAiPrompt: "You are an assistant analyzing Reddit content for AI-related sentiment. Rate the relevance and negativity from 1-10, where 10 indicates high relevance and strong negative sentiment about AI. Provide analysis and a suggested reply.",
    };
  }

  async getSubreddits(): Promise<MonitoredSubreddit[]> {
    return Array.from(this.subreddits.values());
  }

  async addSubreddit(subreddit: InsertSubreddit): Promise<MonitoredSubreddit> {
    const id = this.currentSubredditId++;
    const newSubreddit: MonitoredSubreddit = { 
      ...subreddit, 
      id,
      isActive: subreddit.isActive || 1
    };
    this.subreddits.set(id, newSubreddit);
    return newSubreddit;
  }

  async removeSubreddit(id: number): Promise<void> {
    this.subreddits.delete(id);
  }

  async updateSubredditStatus(id: number, isActive: number): Promise<void> {
    const subreddit = this.subreddits.get(id);
    if (subreddit) {
      this.subreddits.set(id, { ...subreddit, isActive });
    }
  }

  async getPosts(filter?: { status?: string }): Promise<MonitoredPost[]> {
    let posts = Array.from(this.posts.values());
    if (filter?.status) {
      posts = posts.filter(post => post.status === filter.status);
    }
    return posts;
  }

  async addPost(post: InsertPost): Promise<MonitoredPost> {
    const id = this.currentPostId++;
    const newPost: MonitoredPost = {
      ...post,
      id,
      status: post.status || "pending",
      suggestedReply: post.suggestedReply || null
    };
    this.posts.set(id, newPost);
    return newPost;
  }

  async updatePostStatus(id: number, status: string): Promise<void> {
    const post = this.posts.get(id);
    if (post) {
      this.posts.set(id, { ...post, status });
    }
  }

  async getConfig(): Promise<Config> {
    return this.config;
  }

  async updateConfig(config: Config): Promise<void> {
    this.config = config;
  }
}

export const storage = new MemStorage();