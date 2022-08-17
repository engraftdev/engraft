import { createContext, memo, ReactElement, ReactNode } from "react";
import { AddToContext } from "src/util/context";
import { newId } from "src/util/id";
import { Setter, Updater } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";

export type Tool<P extends ToolProgram = any> = {
  Component: ToolComponent<P>;
  programFactory: ProgramFactory<P>;
}

export type ToolOutput = ToolOutputValue | ToolOutputError;
export type ToolOutputValue = {
  value: unknown;
  alreadyDisplayed?: boolean;
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
}

export type ToolView = {
  render: (props: ToolViewRenderProps) => ReactElement<any, any> | null
}

export interface ToolProps<P extends ToolProgram> {
  program: P;
  updateProgram: Updater<P>;
  reportOutput: Setter<ToolOutput | null>;
  reportView: Setter<ToolView | null>;
}

export interface ToolComponent<P extends ToolProgram> {
  (props: ToolProps<P>): ReactElement<any, any> | null;
}

export type ProgramFactory<P extends ToolProgram> = (defaultInputCode?: string) => P;

let toolIndex: { [toolName: string]: Tool } = {};

export function lookUpTool(toolName: string): Tool<any> {
  const tool = toolIndex[toolName];
  if (!tool) {
    // TODO: return a "ToolNotFoundTool" instead of throwing
    throw new Error(`No tool registered for ${toolName}`);
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
    throw new Error(`Tool has no Component`);
  }

  const { toolName } = tool.programFactory();
  (tool.Component as any).displayName = toolName;
  toolIndex[toolName] = tool;
}



export interface VarBinding {
  var_: Var;
  value?: ToolOutput;
}

export type VarBindings = {[varId: string]: VarBinding};

export const VarBindingsContext = createContext<VarBindings>({});
VarBindingsContext.displayName = 'VarBindingsContext';

// TODO: figure out some names

export interface PossibleVarBinding {
  var_: Var;
  request: () => void;
}

export type PossibleVarBindings = {[varId: string]: PossibleVarBinding};

export const PossibleVarBindingsContext = createContext<PossibleVarBindings>({});
PossibleVarBindingsContext.displayName = 'PossibleVarBindingsContext';




export interface Var {
  id: string;
  label: string;
}

export function newVar(label = 'new var') {
  return {id: newId(), label};
}


export interface ProvideVarBindingProps {
  var_: Var;
  value?: ToolOutput;
  children?: ReactNode | undefined,
}

export const ProvideVarBinding = memo(function ProvideVar({var_, value, children}: ProvideVarBindingProps) {
  const varBinding = useMemoObject({var_, value});

  return <AddToContext context={VarBindingsContext} k={var_.id} v={varBinding}>
    {children}
  </AddToContext>
});
