import { defineConfig } from 'vite'
import {resolve} from "path";

// TODO: how to keep this config in sync with repo-wide vite.config.ts?
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/injected_script.js'),
            name: 'injected_script',
            fileName: 'injected_script',
        },
    },
})
