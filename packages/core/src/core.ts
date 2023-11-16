import { Refunction } from "@engraft/refunc/lib/index.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { EngraftPromise } from "./EngraftPromise.js";
import { randomId } from "./randomId.js";
import { EngraftContext } from "./context.js";

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
  context: EngraftContext,
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
  render: ToolViewRender<P>,
  showsOwnOutput?: boolean,
}

export type ToolViewRender<P extends ToolProgram> =
  Refunction<[props: ToolViewRenderProps<P>, element: Element], void>;

export type ToolViewRenderProps<P> = {
  updateProgram: Updater<P>,
  scopeVarBindings: VarBindings,
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,
  frameBarBackdropElem?: HTMLDivElement,
  onBlur?: () => void,
}

export type MakeProgram<P extends ToolProgram> =
  (context: EngraftContext, defaultInputCode?: string) => P;

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

export function newVar(label = 'new var') {
  return {id: randomId(), label};
}

export function varBindingsValid(varBindings: VarBindings): boolean {
  return Object.entries(varBindings).every(([varId, binding]) => {
    return binding.var_.id === varId;
  });
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
