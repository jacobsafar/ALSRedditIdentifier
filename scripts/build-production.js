#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function buildProduction() {
  try {
    console.log('Starting production build...');
    
    // Ensure dist directory exists
    const distDir = join(projectRoot, 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Build server using our custom build script
    console.log('\n🔨 Building server...');
    await runCommand('node', ['scripts/build-server.js']);
    
    // Build client using Vite
    console.log('\n🔨 Building client...');
    await runCommand('npm', ['run', 'build:client']);
    
    console.log('\n✅ Production build completed successfully!');
    console.log('You can now run "npm start" to start the production server.');
    
  } catch (error) {
    console.error('\n❌ Production build failed:', error.message);
    process.exit(1);
  }
}

buildProduction();