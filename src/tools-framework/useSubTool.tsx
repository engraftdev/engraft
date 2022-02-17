import { useCallback, useEffect } from "react";
import CallFunction from "../util/CallFunction";
import { Updater, useAt, useStateSetOnly } from "../util/state";
import { ToolConfig, toolIndex, ToolValue, ToolView, ToolViewProps } from "./tools";

export interface UseToolProps<C extends ToolConfig> {
  config: C,
  updateConfig: Updater<C>
}

export type UseToolReturn = [
  component: JSX.Element,
  makeView: (props: ToolViewProps) => JSX.Element | null,
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

  const makeView = useCallback(function F(props: ToolViewProps) {
    useEffect(() => {
      console.log(`mounting view for ${toolName}`);
      return () => console.log(`unmounting view for ${toolName}`);
    }, [])

    if (!view) {
      return null;
    }

    return <CallFunction key={toolName} f={() => view(props)}/>
  }, [view, toolName]);

  return [component, makeView, output];
}


// for the common case where a tool's config is a key in a super-tool's config

export interface UseSubToolProps<C, K extends keyof C> {
  config: C,
  updateConfig: Updater<C>,
  subKey: K
}

// TODO: doesn't check that the sub-config is actually a toolconfig! dang typing

export function useSubTool<C, K extends keyof C>({config, updateConfig, subKey}: UseSubToolProps<C, K>) {
  const [subConfig, updateSubConfig] = useAt(config, updateConfig, subKey);

  return useTool<any>({
    config: subConfig,
    updateConfig: updateSubConfig,
  })
}
