#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting production deployment...');

// Check if we're in production mode
process.env.NODE_ENV = 'production';

// First, run the build command using our custom build script
console.log('📦 Building application...');
const buildProcess = spawn('node', ['scripts/build-production.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed with exit code:', code);
    process.exit(1);
  }
  
  console.log('✅ Build completed successfully!');
  
  // Check if build output exists
  const distPath = resolve(rootDir, 'dist');
  if (!existsSync(distPath)) {
    console.error('❌ Build directory not found:', distPath);
    process.exit(1);
  }
  
  console.log('🎯 Starting production server...');
  
  // Start the production server
  const startProcess = spawn('npm', ['start'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  
  startProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Server failed with exit code:', code);
      process.exit(1);
    }
  });
});

buildProcess.on('error', (err) => {
  console.error('❌ Build process error:', err);
  process.exit(1);
});