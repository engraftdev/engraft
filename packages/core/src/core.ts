import { Refunction } from "@engraft/refunc/lib/index.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { weakMapCache } from "@engraft/shared/lib/cache.js";
import { ReactElement, createContext } from "react";
import { EngraftPromise } from "./EngraftPromise.js";
import { randomId } from "./randomId.js";

// NOTE: The Engraft codebase uses "tool" to refer to what our paper calls
// "components". This is outdated terminology that will be changed soon.

export type Tool<P extends ToolProgram = ToolProgram> = {
  name: P['toolName'],
  run: ToolRun<P>,
  makeProgram: MakeProgram<P>,
  collectReferences: CollectReferences<P>,
  isInternal?: boolean,
}

export type ToolProgram = {
  toolName: string,
  debugId?: string,
  [others: string]: unknown,
}

export type ToolRun<P extends ToolProgram> =
  Refunction<[props: ToolProps<P>], ToolResult<P>>;

export type ToolProps<P extends ToolProgram> = {
  program: P,
  varBindings: VarBindings,
}

export type VarBindings = {
  [varId: string]: VarBinding
}

export type VarBinding = {
  var_: Var,
  outputP: EngraftPromise<ToolOutput>,
}

export type Var = {
  id: string,
  label: string,
  autoCompleteLabel?: string,
}

export type ToolOutput = {
  value: unknown,
}

export type ToolResult<P extends ToolProgram = ToolProgram> = {
  outputP: EngraftPromise<ToolOutput>,
  view: ToolView<P>,
};

export type ToolView<P extends ToolProgram> = {
  render: (props: ToolViewRenderProps<P>) => ReactElement<any, any> | null,
  showsOwnOutput?: boolean,
}

export type ToolViewRenderProps<P> = {
  updateProgram: Updater<P>,
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,
  frameBarBackdropElem?: HTMLDivElement,
  onBlur?: () => void,
}

export type ToolViewContextValue = {
  scopeVarBindings: VarBindings,
}

export const ToolViewContext = createContext<ToolViewContextValue>({
  scopeVarBindings: {},
});

export type MakeProgram<P extends ToolProgram> =
  (defaultInputCode?: string) => P;

export type CollectReferences<P extends ToolProgram> =
  (program: P) => ReferenceCollection;

export type ReferenceCollection =
  | ReferenceCollectionArrayElem[]
  | ToolProgram
  | Var
  | {id: string}

export type ReferenceCollectionArrayElem =
  | ReferenceCollection
  | {'-': ReferenceCollection}

// We use Tool<ToolProgram> as the generic tool type, in lieu of existential types.
export function forgetP<P extends ToolProgram>(tool: Tool<P>): Tool {
  return tool as any as Tool;
}

let toolIndex: { [toolName: string]: Tool } = {};

export function lookUpToolByName(toolName: string): Tool<ToolProgram> {
  const tool = toolIndex[toolName];
  if (!tool) {
    return toolIndex['not-found'];
  }
  return tool;
}

export function lookUpToolByProgram<P extends ToolProgram>(program: P): Tool<P> {
  const tool = lookUpToolByName(program.toolName);
  return tool as any as Tool<P>;  // unless it's a not-found tool (which is also fine), this is safe
}

// intentionally awkward name to remind you to prefer use of lookUpToolByX
export function getFullToolIndex(): { [toolName: string]: Tool<ToolProgram> } {
  return toolIndex;
}

export function registerTool<P extends ToolProgram>(tool: Tool<P>) {
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
  toolIndex[tool.name] = forgetP(tool);
}

export function newVar(label = 'new var') {
  return {id: randomId(), label};
}

export function varBindingsValid(varBindings: VarBindings): boolean {
  return Object.entries(varBindings).every(([varId, binding]) => {
    return binding.var_.id === varId;
  });
}

export const references = weakMapCache(<P extends ToolProgram>(program: P): Set<string> => {
  // TODO: The one risk of caching this is that lookUpTool might produce varying results if someday
  // the registry changes.
  const tool = lookUpToolByProgram(program);
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

export function programSummary(program: ToolProgram): string {
  let summary = program.toolName;
  if (program.debugId) {
    summary += `#${program.debugId}`;
  }
  return summary;
}

export function defineTool<P extends ToolProgram>(tool: Tool<P>) {
  return tool;
}
