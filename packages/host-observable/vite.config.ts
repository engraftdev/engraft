import { resolve } from 'path';
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // Not sure how `chalk` is getting into builds, but it breaks things. This works!
      'chalk': '/dev/null',
    }
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': false,
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env': {},
    'process.emitWarning': false,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'EngraftObservableHost',
      fileName: 'engraft-observable-host',
    },
    // TODO: these are copied from the root vite.config.js; idk the best way to share them
    commonjsOptions: { },
    rollupOptions: {
      external: [
        'pyodide/pyodide.js',
      ],
    },
    // sourcemap: mode === 'development',
    minify: mode === 'production',
  },
}));
