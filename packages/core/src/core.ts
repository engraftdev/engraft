import { IncrFunction } from "@engraft/incr";
import { weakMapCache } from "@engraft/shared/src/cache";
import { ReactElement } from "react";
import { EngraftPromise } from "./EngraftPromise";
import { randomId } from './randomId';

export type Tool<P extends ToolProgram = ToolProgram> = {
  run: ToolRun<P>;
  programFactory: ProgramFactory<P>;
  computeReferences: ComputeReferences<P>;  // TODO: separate from `run` because it's supposed to be statically available, but work may be duped
  isInternal?: boolean;
}

export type ToolProgram = {
  toolName: string,
  debugId?: string,
  [others: string]: unknown,
}

export type ToolRun<P extends ToolProgram> = IncrFunction<[props: ToolProps<P>], ToolResult<P>>;

export type ToolResult<P extends ToolProgram = ToolProgram> = {
  outputP: EngraftPromise<ToolOutput>,
  view: ToolView<P>,
};

export type ToolOutput = {
  value: unknown;
};

export type ToolView<P extends ToolProgram> = {
  render: (props: ToolViewRenderProps<P>) => ReactElement<any, any> | null
  showsOwnOutput?: boolean,
}

export type ToolViewRenderProps<P> = {
  updateProgram: Updater<P>,
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,  // TODO: this is just for slots, huh?
}

export type Updater<P> = (update: (program: P) => P) => void;

export type ToolProps<P extends ToolProgram> = {
  program: P,
  varBindings: VarBindings,
}

export type ProgramFactory<P extends ToolProgram> = (defaultInputCode?: string) => P;

export type ComputeReferences<P extends ToolProgram> = (program: P) => Set<string>;

let toolIndex: { [toolName: string]: Tool } = {};

export function lookUpTool(toolName: string): Tool<any> {
  const tool = toolIndex[toolName];
  if (!tool) {
    return toolIndex['not-found'];
  }
  return tool;
}

// intentionally awkward name to remind you to prefer use of lookUpTool
export function getFullToolIndex(): { [toolName: string]: Tool<any> } {
  return toolIndex;
}

export function registerTool(tool: Tool<any>) {
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
  toolIndex[toolName] = tool;
}



export type VarBinding = {
  var_: Var,
  outputP: EngraftPromise<ToolOutput>,
}

export type VarBindings = {[varId: string]: VarBinding};

export type Var = {
  id: string,
  label: string,
  autoCompleteLabel?: string,
}

export function newVar(label = 'new var') {
  return {id: randomId(), label};
}

export function varBindingsValid(varBindings: VarBindings): boolean {
  return Object.entries(varBindings).every(([varId, binding]) => {
    return binding.var_.id === varId;
  });
}

export const references = weakMapCache((program: ToolProgram): Set<string> => {
  // TODO: The one risk of caching this is that lookUpTool might produce varying results if someday
  // the registry changes.
  const tool = lookUpTool(program.toolName);
  return tool.computeReferences(program);
});

export function programSummary(program: ToolProgram): string {
  let summary = program.toolName;
  if (program.debugId) {
    summary += `#${program.debugId}`;
  }
  return summary;
}