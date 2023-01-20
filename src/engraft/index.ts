import { ReactElement } from "react";
import { Mento } from "src/mento";
import { EngraftStream } from "./EngraftStream";
import { newId } from "src/util/id";
import { Updater } from "src/util/immutable";
import { EngraftPromise } from "./EngraftPromise";

export type Tool<P extends ToolProgram = ToolProgram> = {
  run: ToolRun<P>;
  programFactory: ProgramFactory<P>;
  computeReferences: ComputeReferences<P>;  // TODO: separate from `run` because it's supposed to be statically available, but work may be duped
  isInternal?: boolean;
}

export type ToolProgram = {
  toolName: string,
  debugId?: string,
  [others: string]: any,
}

export type ToolRun<P extends ToolProgram> = Mento<[props: ToolProps<P>], ToolResult>;

export type ToolResult = {
  outputP: EngraftPromise<ToolOutput>,
  viewS: EngraftStream<ToolView>,
};

export type ToolOutput = {
  value: unknown;
  alreadyDisplayed?: boolean;  // TODO: wrong place? it's persisted too far
};

export type ToolView = {
  render: (props: ToolViewRenderProps) => ReactElement<any, any> | null
}

export interface ToolViewRenderProps {
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,  // TODO: this is just for slots, huh?
}

export interface ToolProps<P extends ToolProgram> {
  program: P;
  varBindings: VarBindings;

  // TODO: might belong in view? not sure
  updateProgram: Updater<P>;
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



export interface VarBinding {
  var_: Var;
  outputP: EngraftPromise<ToolOutput>;
}

export type VarBindings = {[varId: string]: VarBinding};

export interface Var {
  id: string;
  label: string;
  autoCompleteLabel?: string;
}

export function newVar(label = 'new var') {
  return {id: newId(), label};
}

// TODO: cache with a WeakMap?
export function references(program: ToolProgram): Set<string> {
  const tool = lookUpTool(program.toolName);
  return tool.computeReferences(program);
}

export function programSummary(program: ToolProgram): string {
  let summary = program.toolName;
  if (program.debugId) {
    summary += `#${program.debugId}`;
  }
  return summary;
}
