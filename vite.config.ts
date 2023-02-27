import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";

export default defineConfig({
  plugins: [
    checker({ typescript: true }),
  ],
  resolve: {
    alias: {
      // Local file references; will probably be removed in monorepo world.
      'src': '/src',
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
});
