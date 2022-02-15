import { ReactElement, useMemo } from "react";
import FunctionComponent from "../util/FunctionComponent";
import useStrictState, { Setter, subSetter } from "../util/useStrictState";

export type ToolValue = {
  toolValue: unknown
};

export interface ToolConfig {
  toolName: string;
}

export type ToolView = () => ReactElement<any, any> | null;

export interface ToolProps<C extends ToolConfig> {
  context: { [key: string]: ToolValue };
  config: C;
  reportConfig: Setter<C>;
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


type ToolWithViewProps = { Tool: Tool<any> } & Omit<ToolProps<any>, 'reportView'>;

export function ToolWithView({ Tool, context, config, reportConfig, reportOutput }: ToolWithViewProps) {
  const [view, viewSetter] = useStrictState<ToolView | null>(null);

  return <>
    <Tool context={context} config={config} reportConfig={reportConfig} reportOutput={reportOutput} reportView={viewSetter} />
    <FunctionComponent f={view} ifMissing={<span>view missing</span>} />
  </>
}


export function useSubTool<C extends ToolConfig, K extends keyof C>({context, config, reportConfig, subKey}: {context: any, config: C, reportConfig: Setter<C>, subKey: K}) {
  const [value, setValue] = useStrictState<ToolValue | null>(null)
  const [view, setView] = useStrictState<ToolView | null>(null)
  const forwardConfig = useMemo(() => subSetter(reportConfig, subKey), [reportConfig, subKey]);

  const Tool = toolIndex[(config[subKey] as any as ToolConfig).toolName]

  const component = <Tool
    context={context}
    config={config[subKey]}
    reportConfig={forwardConfig}
    reportOutput={setValue}
    reportView={setView}
  />

  return {
    value, view, component
  }
}
