import { Tool, ToolProgram } from "./index.js";
import { hasProperty } from "@engraft/shared/lib/hasProperty.js";

export type ToolModule<P extends ToolProgram = ToolProgram> = Tool<P> | { default: Tool<P> } | { tool: Tool<P> };

export function toolFromModule<P extends ToolProgram>(module: ToolModule<P>): Tool<P> {
  if (hasProperty(module, "tool")) {
    return module.tool;
  } else if (hasProperty(module, "default")) {
    return module.default;
  } else {
    return module;
  }
}
