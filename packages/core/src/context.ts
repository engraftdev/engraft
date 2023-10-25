import { weakMapCache } from "@engraft/shared/lib/cache.js";
import { ReferenceCollection, Tool, ToolProgram, forgetP } from "./core.js";

// CONTEXT

export type EngraftContext = {
  dispatcher: Dispatcher,
  makeSlotWithCode: MakeSlotWithCode,
  makeSlotWithProgram: MakeSlotWithProgram,
  debugMode: false,
}

export type MakeSlotWithCode =
  (code?: string) => ToolProgram;

export type MakeSlotWithProgram =
  (program: ToolProgram, defaultCode?: string) => ToolProgram;


// Every run of an Engraft component goes through the Dispatcher. The main
// responsibility of the Dispatcher is to resolve a component name to the
// component's implementation.

export class Dispatcher {
  toolIndex: { [toolName: string]: Tool } = {};

  referencesForProgram = weakMapCache(<P extends ToolProgram>(program: P): Set<string> => {
    // TODO: The one risk of caching this is that lookUpTool might produce varying results if someday
    // the registry changes.
    const tool = this.lookUpToolByProgram(program);
    const collection = tool.collectReferences(program);
    return this.resolveReferenceCollection(collection);
  });

  resolveReferenceCollection(collection: ReferenceCollection): Set<string> {
    // collection: ReferenceCollectionArrayElem[]
    if (Array.isArray(collection)) {
      const toReturn: Set<string> = new Set();
      for (const entry of collection) {
        if ('-' in entry) {
          const negCollection = entry['-'] as ReferenceCollection;
          const negRefs = this.resolveReferenceCollection(negCollection);
          for (const ref of negRefs) {
            toReturn.delete(ref);
          }
        } else {
          const refs = this.resolveReferenceCollection(entry);
          for (const ref of refs) {
            toReturn.add(ref);
          }
        }
      }
      return toReturn;
    }

    // collection: ToolProgram
    if ('toolName' in collection) {
      return this.referencesForProgram(collection);
    }

    // collection: Var | { id: string }
    return new Set([collection.id]);
  }

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
