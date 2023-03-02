/// <reference types="vitest" />
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { execSync } from "child_process";

export default defineConfig(() => {
  const gitCommitHash = execSync('git rev-parse HEAD').toString().trimEnd();
  process.env.VITE_GIT_COMMIT_HASH = gitCommitHash;

  return {
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
  };
});
