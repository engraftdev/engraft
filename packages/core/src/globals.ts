import { weakMapCache } from "@engraft/shared/lib/cache.js";
import { Dispatcher } from "./Dispatcher.js";
import { ReferenceCollection, ToolProgram } from "./core.js";

// Engraft tools expect access to some features from their environment, like a
// registry of tools and a way to make slots. Eventually, we will want to handle
// this rigorously and flexibly. For now, we use globals.

// TODO: move tool registry to globals

const _globals = {
  dispatcher: new Dispatcher(),
  slotWithCode: null as null | typeof slotWithCode,
  slotWithProgram: null as null | typeof slotWithProgram,
  debugMode: false
}

export function dispatcher(): Dispatcher {
  return _globals.dispatcher;
}
export const references = weakMapCache(<P extends ToolProgram>(program: P): Set<string> => {
  // TODO: The one risk of caching this is that lookUpTool might produce varying results if someday
  // the registry changes.
  const tool = dispatcher().lookUpToolByProgram(program);
  const collection = tool.collectReferences(program);
  return resolveReferenceCollection(collection);
});
export function resolveReferenceCollection(collection: ReferenceCollection): Set<string> {
  // collection: ReferenceCollectionArrayElem[]
  if (Array.isArray(collection)) {
    const toReturn: Set<string> = new Set();
    for (const entry of collection) {
      if ('-' in entry) {
        const negCollection = entry['-'] as ReferenceCollection;
        const negRefs = resolveReferenceCollection(negCollection);
        for (const ref of negRefs) {
          toReturn.delete(ref);
        }
      } else {
        const refs = resolveReferenceCollection(entry);
        for (const ref of refs) {
          toReturn.add(ref);
        }
      }
    }
    return toReturn;
  }

  // collection: ToolProgram
  if ('toolName' in collection) {
    return references(collection);
  }

  // collection: Var | { id: string }
  return new Set([collection.id]);
}

export function slotWithCode(program: string = ''): ToolProgram {
  if (!_globals.slotWithCode) {
    throw new Error('slotWithCode not set yet');
  }
  return _globals.slotWithCode(program);
}
export function setSlotWithCode(slotWithCodeNew: typeof slotWithCode) {
  _globals.slotWithCode = slotWithCodeNew;
}

export function slotWithProgram<P extends ToolProgram>(program: P): ToolProgram {
  if (!_globals.slotWithProgram) {
    throw new Error('slotWithProgram not set yet');
  }
  return _globals.slotWithProgram(program);
}
export function setSlotWithProgram(slotWithProgramNew: typeof slotWithProgram) {
  _globals.slotWithProgram = slotWithProgramNew;
}

export function debugMode(): boolean {
  return _globals.debugMode;
}
export function setDebugMode(debugModeNew: boolean) {
  _globals.debugMode = debugModeNew;
}
