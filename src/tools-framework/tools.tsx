import { createContext, memo, ReactElement, ReactNode } from "react";
import { AddToContext } from "src/util/context";
import { newId } from "src/util/id";
import { Setter, Updater } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";

export type ToolValue = {
  toolValue: unknown;
  alreadyDisplayed?: boolean;
};

export interface ToolProgram {
  toolName: string;
}

export interface ToolViewProps {
  autoFocus?: boolean
}

export type ToolView = (props: ToolViewProps) => ReactElement<any, any> | null;

export interface ToolProps<P extends ToolProgram> {
  program: P;
  updateProgram: Updater<P>;
  reportOutput: Setter<ToolValue | null>;
  reportView: Setter<ToolView | null>;
}

export interface Tool<P extends ToolProgram> {
  (props: ToolProps<P>): ReactElement<any, any> | null;
  defaultProgram: (defaultCode?: string) => P;
}

let toolIndex: { [toolName: string]: Tool<any> } = {};

export function registerTool<C extends ToolProgram>(
  func: (props: ToolProps<C>) => ReactElement<any, any> | null,
  toolName: C['toolName'],
  defaultProgram: C | ((defaultCode?: string) => C)
) {
  let defaultProgramFunc: () => C;
  if (typeof defaultProgram === 'object') {
    defaultProgramFunc = () => (defaultProgram as C);
  } else {
    defaultProgramFunc = defaultProgram;
  }
  toolIndex[toolName] = Object.assign(func, { defaultProgram: defaultProgramFunc });
}

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



export interface VarBinding {
  var_: Var;
  value?: ToolValue;
}

export type VarBindings = {[varId: string]: VarBinding};

export const EnvContext = createContext<VarBindings>({});
EnvContext.displayName = 'EnvContext';

// TODO: figure out some names

export interface PossibleVarBinding {
  var_: Var;
  request: () => void;
}

export type PossibleVarBindings = {[varId: string]: PossibleVarBinding};

export const PossibleEnvContext = createContext<PossibleVarBindings>({});
PossibleEnvContext.displayName = 'PossibleEnvContext';




export interface Var {
  id: string;
  label: string;
}

export function newVar(label = 'new var') {
  return {id: newId(), label};
}


export interface ProvideVarBindingProps {
  var_: Var;
  value?: ToolValue;
  children?: ReactNode | undefined,
}

export const ProvideVarBinding = memo(function ProvideVar({var_, value, children}: ProvideVarBindingProps) {
  const info = useMemoObject({var_, value});

  return <AddToContext context={EnvContext} k={var_.id} v={info}>
    {children}
  </AddToContext>
});
