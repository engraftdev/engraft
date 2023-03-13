import { IncrFunction } from "@engraft/incr";
import { weakMapCache } from "@engraft/shared/lib/cache";
import { Updater } from "@engraft/shared/lib/Updater";
import { ReactElement } from "react";
import { EngraftPromise } from "./EngraftPromise";
import { randomId } from './randomId';

export type Tool<P extends ToolProgram = ToolProgram> = {
  run: ToolRun<P>;
  programFactory: ProgramFactory<P>;
  computeReferences: ComputeReferences<P>;
  isInternal?: boolean;
}

export type ToolProgram = {
  toolName: string,
  debugId?: string,
  [others: string]: unknown,
}

export type ToolRun<P extends ToolProgram> =
  IncrFunction<[props: ToolProps<P>], ToolResult<P>>;

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
  render: (props: ToolViewRenderProps<P>) => ReactElement<any, any> | null
  showsOwnOutput?: boolean,
}

export type ToolViewRenderProps<P> = {
  updateProgram: Updater<P>,
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,
}

export type ProgramFactory<P extends ToolProgram> =
  (defaultInputCode?: string) => P;

export type ComputeReferences<P extends ToolProgram> =
  (program: P) => Set<string>;



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
  if (!tool.programFactory) {
    throw new Error(`Tool has no programFactory`);
  }
  if (!tool.run) {
    console.error(tool);
    throw new Error(`Tool has no run`);
  }
  if (!tool.computeReferences) {
    let toolName = 'UNKNOWN';
    try {
      toolName = tool.programFactory().toolName;
    } catch { }
    throw new Error(`Tool has no references: ${toolName}`);
  }

  const { toolName } = tool.programFactory();
  toolIndex[toolName] = forgetP(tool);
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
  return tool.computeReferences(program);
});

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
