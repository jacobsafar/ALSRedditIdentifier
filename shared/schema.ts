import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const monitoredSubreddits = pgTable("monitored_subreddits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const monitoredPosts = pgTable("monitored_posts", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull(),
  subreddit: text("subreddit").notNull(),
  author: text("author").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  url: text("url").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  score: integer("score").notNull(),
  analysis: jsonb("analysis").notNull(),
  suggestedReply: text("suggested_reply"),
  status: text("status").notNull().default("pending"), // pending, replied, ignored
});

// Add config table
export const configTable = pgTable("config", {
  id: serial("id").primaryKey(),
  scoreThreshold: integer("score_threshold").notNull().default(7),
  checkFrequency: integer("check_frequency").notNull().default(1), // hours
  postsPerFetch: integer("posts_per_fetch").notNull().default(25),
  openAiPrompt: text("openai_prompt").notNull(),
});

export const insertSubredditSchema = createInsertSchema(monitoredSubreddits).pick({
  name: true,
  isActive: true,
});

export const insertPostSchema = createInsertSchema(monitoredPosts).pick({
  postId: true,
  subreddit: true,
  author: true,
  title: true,
  content: true,
  url: true,
  timestamp: true,
  score: true,
  analysis: true,
  suggestedReply: true,
  status: true,
});

export type InsertSubreddit = z.infer<typeof insertSubredditSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type MonitoredSubreddit = typeof monitoredSubreddits.$inferSelect;
export type MonitoredPost = typeof monitoredPosts.$inferSelect;

export const configSchema = z.object({
  scoreThreshold: z.coerce.number().min(1).max(10),
  checkFrequency: z.coerce.number().min(0.5).max(12), // 0.5 to 12 hours
  postsPerFetch: z.coerce.number().min(5).max(100),
  openAiPrompt: z.string().min(10),
});

export type Config = z.infer<typeof configSchema>;