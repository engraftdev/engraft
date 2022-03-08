import memoize from "fast-memoize";
import { memo, useEffect, useMemo } from "react";
import CallFunction from "../util/CallFunction";
import { Setter, updateKeys, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "../util/state";
import { ToolConfig, toolIndex, ToolValue, ToolView, ToolViewProps, ToolViewRender } from "./tools";

// TODO: Tool<any> rather than Tool<ToolConfig>; we trust you'll attach a defaultConfig at some point?
export function useView(reportView: Setter<ToolView | null>, render: ToolViewRender, config: ToolConfig) {
  useEffect(() => {
    reportView({render, toolRep: config.toolName});
    return () => reportView(null);
  }, [reportView, render, config.toolName])
}

export function useOutput(reportOutput: Setter<ToolValue | null>, output: ToolValue | null) {
  useEffect(() => {
    reportOutput(output);
    return () => reportOutput(null);
  }, [reportOutput, output])
}






export interface ShowViewProps extends ToolViewProps {
  view: ToolView | null;
}

export const ShowView = memo(({view, ...rest}: ShowViewProps) => {
  if (!view) {
    return null;
  }

  return <CallFunction key={view.toolRep} f={() => view.render(rest)}/>
})


export interface UseToolProps<C extends ToolConfig> {
  config: C,
  updateConfig: Updater<C>
}

export type UseToolReturn = [
  component: JSX.Element,
  view: ToolView | null,
  output: ToolValue | null,
]

export function useTool<C extends ToolConfig>({config, updateConfig}: UseToolProps<C>): UseToolReturn {
  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null)
  const [view, setView] = useStateSetOnly<ToolView | null>(null)

  const toolName = config.toolName;
  const Tool = toolIndex[toolName]

  const component = <Tool
    config={config}
    updateConfig={updateConfig}
    reportOutput={setOutput}
    reportView={setView}
  />

  return [component, view, output];
}


// for the common case where a tool's config is a key in a super-tool's config

export interface UseSubToolProps<C, K extends keyof C> {
  config: C,
  updateConfig: Updater<C>,
  subKey: K
}

// TODO: doesn't check that the sub-config is actually a toolconfig! dang typing

export function useSubTool<C, K extends string & keyof C>({config, updateConfig, subKey}: UseSubToolProps<C, K>) {
  const [subConfig, updateSubConfig] = useAt(config, updateConfig, subKey);

  return useTool<any>({
    config: subConfig,
    updateConfig: updateSubConfig,
  })
}


type PerTool<T> = {[key: string]: T}

export type UseToolsReturn = [
  components: PerTool<JSX.Element>,
  views: PerTool<ToolView | null>,
  outputs: PerTool<ToolValue | null>,
]

function cleanUpOldProperties<T, U>(oldA: PerTool<T>, newB: PerTool<U>) {
  let newA = oldA;
  Object.keys(oldA).forEach((key) => {
    if (!(key in newB)) {
      if (newA === oldA) {
        newA = {...oldA}
      }
      delete newA[key];
    }
  })
  return newA;
}

export function useTools<C extends ToolConfig>(tools: {[key: string]: UseToolProps<C>}): UseToolsReturn {
  const [outputs, updateOutputs] = useStateUpdateOnly<PerTool<ToolValue | null>>({})
  const [views, updateViews] = useStateUpdateOnly<PerTool<ToolView | null>>({})

  useEffect(() => {
    updateOutputs((oldOutputs) => cleanUpOldProperties(oldOutputs, tools));
    updateViews((oldViews) => cleanUpOldProperties(oldViews, tools));
  }, [tools, updateOutputs, updateViews])

  const reportOutput = useMemo(() => memoize((key: string) => (output: ToolValue | null) => updateKeys(updateOutputs, {[key]: output})), [updateOutputs])
  const reportView = useMemo(() => memoize((key: string) => (view: ToolView | null) => updateKeys(updateViews, {[key]: view})), [updateViews])

  const components = Object.fromEntries(Object.entries(tools).map(([key, {config, updateConfig}]) => {
    const toolName = config.toolName;
    const Tool = toolIndex[toolName]

    return [key, <Tool
      config={config}
      updateConfig={updateConfig}
      reportOutput={reportOutput(key)}
      reportView={reportView(key)}
    />]
  }))

  return [components, views, outputs];
}