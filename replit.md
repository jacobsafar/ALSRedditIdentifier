# ALS Patient Sentiment Monitor - Replit Development Guide

## Overview

This is a full-stack Reddit monitoring application built to track sentiment from ALS patients and their families across subreddits. The application scrapes Reddit posts, analyzes them to understand their feelings, problems, and immediate issues, categorizing posts by sentiment type for research and support purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and building

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon (serverless PostgreSQL)
- **External APIs**: Reddit API (via Snoowrap), OpenAI API

## Key Components

### Database Schema
- **monitoredSubreddits**: Tracks which subreddits to monitor
- **monitoredPosts**: Stores analyzed Reddit posts with scores and sentiment categories
- **configTable**: Application configuration (score thresholds, fetch frequency, AI prompts)

### Reddit Integration
- Uses Snoowrap library for Reddit API access
- Fetches new posts from monitored subreddits
- Filters out posts from the bot's own account
- Supports OAuth authentication with Reddit

### AI Analysis
- Integrates with OpenAI GPT-4o-mini for content analysis
- Analyzes sentiment and emotional distress on a 1-10 scale
- Categorizes posts by sentiment type (emotional_distress, physical_challenges, support_needs, medical_concerns, daily_struggles)
- Configurable system prompts for analysis criteria

### User Interface
- **Dashboard**: Main interface showing pending insights and processed posts
- **Settings**: Configuration for subreddits, AI prompts, and system parameters
- **Post Cards**: Individual post analysis with actions (review, ignore, categorize)
- **Tabs**: Organized view of insights vs. processed posts

## Data Flow

1. **Content Fetching**: Periodic fetching of new Reddit posts from monitored subreddits
2. **AI Analysis**: Each post is analyzed by OpenAI for sentiment and emotional distress scoring
3. **Filtering**: Posts scoring above the threshold are marked as "insights"
4. **User Review**: Users can review, categorize sentiment, or ignore posts
5. **Manual Review**: Users manually review posts on Reddit for research purposes (no automated posting)

## External Dependencies

### APIs
- **Reddit API**: Content fetching and user authentication
- **OpenAI API**: Content analysis and reply generation

### Key Libraries
- **Frontend**: React, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Backend**: Express, Drizzle ORM, Snoowrap, OpenAI SDK
- **Database**: Neon PostgreSQL, WebSocket support

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- Express server with TypeScript compilation via tsx
- Environment variables for API keys and database connection

### Production
- Frontend built with Vite to static files
- Backend compiled with esbuild to single ESM bundle
- Database migrations handled via Drizzle Kit
- Expects environment variables: DATABASE_URL, REDDIT_*, OPENAI_API_KEY

### Key Configuration
- Uses ES modules throughout (type: "module" in package.json)
- TypeScript configuration supports both client and server code
- Database schema shared between frontend and backend via "@shared/*" alias
- Tailwind configured for client-side components only

## Development Notes

- The application is designed for research and support purposes only
- All Reddit engagement is manual through provided links for respectful interaction
- Database uses Drizzle ORM with PostgreSQL dialect
- Frontend uses React Query for efficient data fetching and caching
- The system is configured for hourly content fetching by default
- Focus on understanding ALS patient experiences, not generating responses

## Recent Changes (2025-01-11)

- **Purpose Change**: Updated from AI technology sentiment monitoring to ALS patient sentiment analysis
- **Database Schema**: Removed suggestedReply field, added sentimentCategory field
- **AI Analysis**: Modified prompts to focus on ALS patient experiences and emotions
- **UI Updates**: Changed "Opportunities" to "Insights", "Replied" to "Reviewed"
- **Sentiment Categories**: Added emotional_distress, physical_challenges, support_needs, medical_concerns, daily_struggles
- **Post Cards**: Replaced reply generation with sentiment categorization interface