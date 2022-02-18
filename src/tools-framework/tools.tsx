import { Context, createContext, ReactElement, ReactNode, useContext, useMemo } from "react";
import { Setter, Updater } from "../util/state";

export type ToolValue = {
  toolValue: unknown
};

export interface ToolConfig {
  toolName: string;
}

export interface ToolViewProps {
  autoFocus?: boolean
}

export type ToolViewRender = (props: ToolViewProps) => ReactElement<any, any> | null;

export interface ToolView {
  render: ToolViewRender;
  toolRep: string;  // some indicator of what tool this is coming from, so that we can re-mount if it changes
}

export interface ToolProps<C extends ToolConfig> {
  config: C;
  updateConfig: Updater<C>;
  reportOutput: Setter<ToolValue | null>;
  reportView: Setter<ToolView | null>;
}

export interface Tool<C extends ToolConfig> {
  (props: ToolProps<C>): ReactElement<any, any> | null;
  defaultConfig: C;
}

export let toolIndex: { [toolName: string]: Tool<any> } = {};

export function registerTool<C extends ToolConfig>(
  func: (props: ToolProps<C>) => ReactElement<any, any> | null,
  defaultConfig: C
) {
  toolIndex[defaultConfig.toolName] = Object.assign(func, { defaultConfig });
}

export const EnvContext = createContext<{[k: string]: ToolValue}>({});
EnvContext.displayName = 'EnvContext';




export interface AddToContextProps<V> {
  context: Context<{[k: string]: V}>,
  k: string,
  v: V,
  children?: ReactNode | undefined,
}

export function AddToContext<V>({context, k, v, children}: AddToContextProps<V>) {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, [k]: v};
  }, [oldValue, k, v])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}

export interface AddObjToContextProps<V> {
  context: Context<{[k: string]: V}>,
  obj: {[k: string]: V},
  children?: ReactNode | undefined,
}

export function AddObjToContext<V>({context, obj, children}: AddObjToContextProps<V>) {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, ...obj};
  }, [oldValue, obj])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}
