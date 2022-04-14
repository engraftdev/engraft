import * as Immutable from "immutable";
import { memo, useCallback, useEffect, useMemo } from "react";
import CallFunction from "../util/CallFunction";
import { Setter, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "../util/state";
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

export const ShowView = memo(function ShowView({view, ...rest}: ShowViewProps) {
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
type PerToolInternal<T> = Immutable.Map<string, T>

export type UseToolsReturn = [
  components: PerTool<JSX.Element>,
  views: PerTool<ToolView | null>,
  outputs: PerTool<ToolValue | null>,
]

function cleanUpOldProperties<T, U>(oldA: PerToolInternal<T>, newB: PerTool<U>) {
  let newA = oldA;
  oldA.forEach((_, key) => {
    if (!(key in newB)) {
      newA = newA.delete(key);
    }
  })
  return newA;
}

export function useTools<C extends ToolConfig>(tools: {[key: string]: UseToolProps<C>}): UseToolsReturn {
  const [outputs, updateOutputs] = useStateUpdateOnly<PerToolInternal<ToolValue | null>>(Immutable.Map())
  const [views, updateViews] = useStateUpdateOnly<PerToolInternal<ToolView | null>>(Immutable.Map())

  useEffect(() => {
    updateOutputs((oldOutputs) => cleanUpOldProperties(oldOutputs, tools));
    updateViews((oldViews) => cleanUpOldProperties(oldViews, tools));
  }, [tools, updateOutputs, updateViews])

  const components = Object.fromEntries(Object.entries(tools).map(([keyName, {config, updateConfig}]) => {
    return [keyName, <ToolAt
      key={keyName}
      keyName={keyName}
      config={config}
      updateConfig={updateConfig as unknown as Updater<ToolConfig>}
      updateOutputs={updateOutputs}
      updateViews={updateViews}
    />]
  }))

  const viewsObj = useMemo(() => views.toObject(), [views])
  const outputsObj = useMemo(() => outputs.toObject(), [outputs])

  return [components, viewsObj, outputsObj];
}

interface ToolAtConfig {
  keyName: string,
  config: ToolConfig,
  updateConfig: Updater<ToolConfig>
  updateOutputs: Updater<PerToolInternal<ToolValue | null>>,
  updateViews: Updater<PerToolInternal<ToolView | null>>,
}

const ToolAt = memo(function ToolAt({keyName, updateOutputs, updateViews, config, updateConfig}: ToolAtConfig) {
  const reportOutput = useCallback((output: ToolValue | null) => {
    return updateOutputs((oldOutputs) => oldOutputs.set(keyName, output));
  }, [keyName, updateOutputs])
  const reportView = useCallback((view: ToolView | null) => {
    return updateViews((oldViews) => oldViews.set(keyName, view));
  }, [keyName, updateViews])

  // TODO: use useEffect to clean up after ourselves?

  const toolName = config.toolName;
  const Tool = toolIndex[toolName]

  return <Tool
    config={config}
    updateConfig={updateConfig}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})
