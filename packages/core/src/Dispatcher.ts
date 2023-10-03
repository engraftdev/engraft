import { Tool, ToolProgram, forgetP } from "./core.js";

// Every run of an Engraft component goes through the Dispatcher. The main
// responsibility of the Dispatcher is to resolve a component name to the
// component's implementation.

export class Dispatcher {
  toolIndex: { [toolName: string]: Tool } = {};

  lookUpToolByName(toolName: string): Tool<ToolProgram> {
    const tool = this.toolIndex[toolName];
    if (!tool) {
      // TODO: more disciplined approach?
      return this.toolIndex['not-found'];
    }
    return tool;
  }

  lookUpToolByProgram<P extends ToolProgram>(program: P): Tool<P> {
    const tool = this.lookUpToolByName(program.toolName);
    return tool as any as Tool<P>;  // unless it's a not-found tool (which is also fine), this is safe
  }

  // intentionally awkward name to remind you to prefer use of lookUpToolByX
  getFullToolIndex(): { [toolName: string]: Tool<ToolProgram> } {
    return this.toolIndex;
  }

  registerTool<P extends ToolProgram>(tool: Tool<P>) {
    // do some checks to make sure the tool is valid
    if (!tool.name) {
      throw new Error(`Tool has no name`);
    }
    if (!tool.makeProgram) {
      throw new Error(`Tool has no makeProgram: ${tool.name}`);
    }
    if (!tool.run) {
      throw new Error(`Tool has no run: ${tool.name}`);
    }
    if (!tool.collectReferences) {
      throw new Error(`Tool has no collectReferences: ${tool.name}`);
    }
    this.toolIndex[tool.name] = forgetP(tool);
  }

}
