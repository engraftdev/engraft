import { ToolProgram } from "@engraft/core";

const modules = import.meta.glob('./*.json', { eager: true });
export const examples =
  Object.entries(modules).map(([filename, program]) => ({
    name: filename.match(/\.\/(.*)\.json$/)![1],
    program: program as ToolProgram
  }));
