/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      // Not sure how `chalk` is getting into builds, but it breaks things. This works!
      'chalk': '/dev/null',
    }
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': false,
  },
});
