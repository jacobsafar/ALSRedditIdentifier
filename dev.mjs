#!/usr/bin/env node

import { spawn } from 'child_process';

// Set development environment
process.env.NODE_ENV = 'development';

console.log('🚀 Starting development server...');

// Start the development server using tsx
const devProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

devProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Development server exited with code ${code}`);
    process.exit(code);
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