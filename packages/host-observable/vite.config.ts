/// <reference types="vitest" />
import { resolve } from 'path';
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      // Not sure how `chalk` is getting into builds, but it breaks things. This works!
      'chalk': '/dev/null',
    }
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': false,
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {},
    'process.emitWarning': false,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'EngraftHostObservable',
      fileName: 'engraft-host-observable',
    },
  },
});
