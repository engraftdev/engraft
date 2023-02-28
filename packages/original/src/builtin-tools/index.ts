import { toolFromModule } from "@engraft/core";

const modules = import.meta.glob('./*/index.tsx', { eager: true });
export const builtinTools =
  Object.values(modules).map((module) =>
    toolFromModule(module as any)
  );
