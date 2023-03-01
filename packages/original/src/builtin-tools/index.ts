import { forgetP, Tool, toolFromModule } from "@engraft/core";
import * as toolToyAdder from '@engraft/tool-toy-adder';

const modules = import.meta.glob('./*/index.tsx', { eager: true });
export const builtinTools: Tool[] = [
  ...Object.values(modules).map((module) =>
    toolFromModule(module as any)
  ),
  forgetP(toolFromModule(toolToyAdder)),
]
