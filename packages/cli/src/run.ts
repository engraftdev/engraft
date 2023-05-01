#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from 'node:url';

// The only thing this file does is set up the loader. See src/backend/index.ts for the real entry point.

function relative(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

spawnSync(
  'node',
  [
    '--no-warnings',
    '--experimental-loader', relative('../css-loader.mjs'),
    relative('./backend/index.js'),
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
  }
);
