/// <reference types="vitest" />
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";

export default defineConfig({
  base: './',
  plugins: [
    checker({ typescript: true }),
  ],
  resolve: {
    alias: {
      // Not sure how `chalk` is getting into builds, but it breaks things. This works!
      'chalk': '/dev/null',
    }
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': false,
  },
  // build: {
  //   minify: false,
  // },
  test: {
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    passWithNoTests: true,
    // coverage: {
    //   reporter: ["lcov", "html"],
    // },
  },
});
