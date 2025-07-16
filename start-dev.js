#!/usr/bin/env node

// Direct development server startup
import { spawn } from 'child_process';

// Set development environment
process.env.NODE_ENV = 'development';

console.log('🚀 Starting ALS Patient Sentiment Monitor in development mode...');

// Start the development server using tsx
const devProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

devProcess.on('error', (error) => {
  console.error('Failed to start development server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGTERM');
});