import { Tool } from "./engraft";

export function toolFromModule(module: any) {
  return (module.tool || module.default || module) as Tool;
}
