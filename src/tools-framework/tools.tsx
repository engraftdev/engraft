import { createContext, memo, ReactElement, ReactNode } from "react";
import { AddToContext } from "../util/context";
import { newId } from "../util/id";
import { Setter, Updater } from "../util/state";
import { useMemoObject } from "../util/useMemoObject";

export type ToolValue = {
  toolValue: unknown;
  alreadyDisplayed?: boolean;
};

export interface ToolConfig {
  toolName: string;
}

export interface ToolViewProps {
  autoFocus?: boolean
}

export type ToolView = (props: ToolViewProps) => ReactElement<any, any> | null;

export interface ToolProps<C extends ToolConfig> {
  config: C;
  updateConfig: Updater<C>;
  reportOutput: Setter<ToolValue | null>;
  reportView: Setter<ToolView | null>;
}

export interface Tool<C extends ToolConfig> {
  (props: ToolProps<C>): ReactElement<any, any> | null;
  defaultConfig: () => C;
}

export let toolIndex: { [toolName: string]: Tool<any> } = {};

export function registerTool<C extends ToolConfig>(
  func: (props: ToolProps<C>) => ReactElement<any, any> | null,
  toolName: C['toolName'],
  defaultConfig: C | (() => C)
) {
  let defaultConfigFunc: () => C;
  if (typeof defaultConfig === 'object') {
    defaultConfigFunc = () => (defaultConfig as C);
  } else {
    defaultConfigFunc = defaultConfig;
  }
  toolIndex[toolName] = Object.assign(func, { defaultConfig: defaultConfigFunc });
}



export interface VarInfo {
  config: VarConfig;
  value?: ToolValue;
}

export type VarInfos = {[varId: string]: VarInfo};

export const EnvContext = createContext<VarInfos>({});
EnvContext.displayName = 'EnvContext';

// TODO: figure out some names

export interface PossibleVarInfo {
  config: VarConfig;
  request: () => void;
}

export type PossibleVarInfos = {[varId: string]: PossibleVarInfo};

export const PossibleEnvContext = createContext<PossibleVarInfos>({});
PossibleEnvContext.displayName = 'PossibleEnvContext';




export interface VarConfig {
  id: string;
  label: string;
}

export function newVarConfig(label = 'new var') {
  return {id: newId(), label};
}


export interface ProvideVarProps {
  config: VarConfig;
  value?: ToolValue;
  children?: ReactNode | undefined,
}

export const ProvideVar = memo(function ProvideVar({config, value, children}: ProvideVarProps) {
  const info = useMemoObject({config, value});

  return <AddToContext context={EnvContext} k={config.id} v={info}>
    {children}
  </AddToContext>
});
