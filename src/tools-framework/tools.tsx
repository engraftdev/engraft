import { ReactElement } from "react";
import { newId } from "src/util/id";
import { Setter, Updater } from "src/util/state";

export type Tool<P extends ToolProgram = any> = {
  Component: ToolComponent<P>;
  programFactory: ProgramFactory<P>;
  computeReferences: ComputeReferences<P>;  // TODO: separate from Component because it's supposed to be statically available, but work may be duped
  isInternal?: boolean;
}

export type ToolOutput = ToolOutputValue | ToolOutputError;
export type ToolOutputValue = {
  value: unknown;
  alreadyDisplayed?: boolean;  // TODO: wrong place? it's persisted too far
};
export type ToolOutputError = {
  error: string;
};

export function hasValue(output: ToolOutput | null | undefined): output is ToolOutputValue {
  if (!output) { return false; }
  return 'value' in output;
}

export function valueOrUndefined(output: ToolOutput | null | undefined): unknown {
  if (hasValue(output)) {
    return output.value;
  } else {
    return undefined;
  }
}

export function hasError(output: ToolOutput | null | undefined): output is ToolOutputError {
  if (!output) { return false; }
  return 'error' in output;
}

export interface ToolProgram {
  toolName: string;
}

export interface ToolViewRenderProps {
  autoFocus?: boolean,
  expand?: boolean,
  noFrame?: boolean,  // TODO: this is just for slots, huh?
}

export type ToolView = {
  render: (props: ToolViewRenderProps) => ReactElement<any, any> | null
}

export interface ToolProps<P extends ToolProgram> {
  program: P;
  updateProgram: Updater<P>;
  varBindings: VarBindings;
  reportOutput: Setter<ToolOutput | null>;
  reportView: Setter<ToolView | null>;
}

export interface ToolComponent<P extends ToolProgram> {
  (props: ToolProps<P>): ReactElement<any, any> | null;
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
  if (!tool.Component) {
    console.error(tool);
    throw new Error(`Tool has no Component`);
  }
  if (!tool.computeReferences) {
    let toolName = 'UNKNOWN';
    try {
      toolName = tool.programFactory().toolName;
    } catch { }
    throw new Error(`Tool has no references: ${toolName}`);
  }

  const { toolName } = tool.programFactory();
  (tool.Component as any).displayName = toolName;
  toolIndex[toolName] = tool;
}



export interface VarBinding {
  var_: Var;
  output: ToolOutput | undefined;
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
