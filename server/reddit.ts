import Snoowrap from "snoowrap";

export class RedditClient {
  private client: Snoowrap;
  private readonly BOT_USERNAME = "AIBlock_Extension";

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
      // Strip 'r/' prefix if present
      const subredditName = subreddit.replace(/^r\//, '').trim();
      console.log(`Fetching posts from r/${subredditName}`);

      // Validate subreddit exists
      const subredditInfo = await this.client.getSubreddit(subredditName).fetch();
      console.log(`Found subreddit: ${subredditInfo.display_name}, subscribers: ${subredditInfo.subscribers}`);

      const posts = await this.client.getSubreddit(subredditName).getNew({ limit });
      console.log(`Successfully fetched ${posts.length} posts`);

      // Filter out posts from our bot account and map to our format
      return posts
        .filter(post => post.author.name !== this.BOT_USERNAME)
        .map(post => ({
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
      console.error(`Reddit API error (posts): ${errorMessage}`);
      throw new Error(`Failed to fetch posts from r/${subreddit}: ${errorMessage}`);
    }
  }

  async getNewComments(subreddit: string, limit = 25) {
    try {
      // Strip 'r/' prefix if present
      const subredditName = subreddit.replace(/^r\//, '').trim();
      console.log(`Fetching comments from r/${subredditName}`);
      const comments = await this.client.getSubreddit(subredditName).getNewComments({ limit });
      console.log(`Successfully fetched ${comments.length} comments`);

      // Filter out comments from our bot account and map to our format
      return comments
        .filter(comment => comment.author.name !== this.BOT_USERNAME)
        .map(comment => ({
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
      console.error(`Reddit API error (comments): ${errorMessage}`);
      throw new Error(`Failed to fetch comments from r/${subreddit}: ${errorMessage}`);
    }
  }
}