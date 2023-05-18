import { defineConfig } from 'vite'
import {resolve} from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/injected_script.js'),
            name: 'injected_script',
            fileName: 'injected_script',
        },
    },
})
