#!/usr/bin/env node
// Simple production startup script for Replit deployment
// This script builds the app and starts it in production mode

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting production deployment...');

try {
  // Check if we already have a build
  if (!existsSync('./dist')) {
    console.log('📦 Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed!');
  } else {
    console.log('📦 Using existing build...');
  }

  // Start the production server
  console.log('🎯 Starting production server...');
  execSync('npm start', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}