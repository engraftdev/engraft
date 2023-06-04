/// <reference types="vitest" />
import { defineConfig } from 'vite'
import {resolve} from "path";

// TODO: how to keep this config in sync with repo-wide vite.config.ts?
export default defineConfig({
    test: {
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/injected_script.ts'),
            name: 'injected_script',
            fileName: 'injected_script',
        },
    },
})
