# Production Deployment Guide

## Issue
The default Replit deployment configuration uses `npm run dev` which is blocked for security reasons in production deployments.

## Solution
The application is already configured for production deployment with proper build scripts.

## Manual Deployment Steps

### 1. Build the Application
```bash
npm run build
```
This command:
- Builds the React frontend using Vite
- Compiles the TypeScript backend using esbuild
- Creates optimized production bundles

### 2. Start Production Server
```bash
npm start
```
This command:
- Sets NODE_ENV=production
- Starts the Express server serving static files
- Runs the optimized production build

### 3. Alternative: Use Deployment Scripts
We've created helper scripts for easier deployment:

**Option A: Bash Script**
```bash
./scripts/deploy.sh
```

**Option B: Node.js Script**
```bash
node scripts/production-start.js
```

## Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for sentiment analysis
- `REDDIT_CLIENT_ID`: Reddit API client ID
- `REDDIT_CLIENT_SECRET`: Reddit API client secret
- `REDDIT_REFRESH_TOKEN`: Reddit API refresh token
- `REDDIT_USER_AGENT`: Reddit API user agent

## Verification
After deployment, the application should:
1. Serve the React frontend at the root URL
2. Provide API endpoints under `/api/`
3. Connect to the PostgreSQL database
4. Successfully fetch and analyze Reddit posts

## Notes
- The build process may take several minutes due to the large dependency tree
- Ensure all environment variables are properly configured before deployment
- The production server runs on port 5000 by default