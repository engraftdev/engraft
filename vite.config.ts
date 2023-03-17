/// <reference types="vitest" />
import * as PluginReactModule from "@vitejs/plugin-react";
import { execSync } from "child_process";
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";

// TODO: what hath ESM wrought?
const react = PluginReactModule.default as unknown as typeof import("@vitejs/plugin-react").default;

export default defineConfig(() => {
  const gitCommitHash = execSync('git rev-parse HEAD').toString().trimEnd();
  process.env.VITE_GIT_COMMIT_HASH = gitCommitHash;

  return {
    base: './',
    plugins: [
      checker({ typescript: true }),
      react(),
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
      passWithNoTests: true,
      css: true,
      deps: {
        external: ['**/node_modules/**']
      }
      // coverage: {
      //   reporter: ["lcov", "html"],
      // },
    },
  };
});
