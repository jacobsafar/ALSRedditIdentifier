#!/usr/bin/env node

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Comprehensive list of external dependencies to exclude from bundling
const externalDependencies = [
  'pg-native',
  'lightningcss',
  '@babel/*',
  'vite',
  '@vitejs/*',
  '@rollup/*',
  'rollup',
  '@esbuild/*',
  'postcss',
  'tailwindcss',
  'autoprefixer',
  '@replit/vite-plugin-*',
  '@replit/vite-plugin-cartographer',
  '@replit/vite-plugin-runtime-error-modal',
  '@replit/vite-plugin-shadcn-theme-json',
  '@tailwindcss/*',
  'drizzle-kit',
  'tsx',
  'typescript',
  // Add more patterns as needed
  'esbuild',
  '@types/*'
];

async function buildServer() {
  try {
    console.log('Building server with comprehensive external dependencies...');
    
    await build({
      entryPoints: [join(projectRoot, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      outfile: join(projectRoot, 'dist/index.js'),
      format: 'esm',
      external: externalDependencies,
      minify: false,
      sourcemap: true,
      target: 'node18',
      tsconfig: join(projectRoot, 'tsconfig.json'),
      logLevel: 'info'
    });
    
    console.log('Server build completed successfully!');
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

buildServer();