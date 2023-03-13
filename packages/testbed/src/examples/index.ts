import { ToolProgram } from "@engraft/core";

const modules = import.meta.glob('./*.json', { eager: true });
export const examples =
  Object.entries(modules).map(([filename, program]) => ({
    name: filename.match(/\.\/(.*)\.json$/)![1],
    // vite seems to import json both directly and with `default`; let's just take default
    program: (program as {default: ToolProgram}).default,
  }));
