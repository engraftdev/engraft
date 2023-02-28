import { Tool, ToolProgram } from ".";
import { hasProperty } from "@engraft/shared/src/hasProperty";

export function toolFromModule<P extends ToolProgram>(module: Tool<P> | { default: Tool<P> } | { tool: Tool<P> }) {
  if (hasProperty(module, "tool")) {
    return module.tool;
  } else if (hasProperty(module, "default")) {
    return module.default;
  } else {
    return module;
  }
}
