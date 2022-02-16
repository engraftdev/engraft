import { useCallback, useEffect, useMemo } from "react";
import CallFunction from "../util/CallFunction";
import useStrictState, { Setter, subSetter } from "../util/useStrictState";
import { ToolConfig, toolIndex, ToolValue, ToolView, ToolViewProps } from "./tools";

export interface UseSubToolProps<C extends ToolConfig, K extends keyof C> {
  context: any,
  config: C,
  reportConfig: Setter<C>,
  subKey: K
}

export function useSubTool<C extends ToolConfig, K extends keyof C>({context, config, reportConfig, subKey}: UseSubToolProps<C, K>) {
  const [value, setValue] = useStrictState<ToolValue | null>(null)
  const [view, setView] = useStrictState<ToolView | null>(null)
  const forwardConfig = useMemo(() => subSetter(reportConfig, subKey), [reportConfig, subKey]);

  const toolName = (config[subKey] as any as ToolConfig).toolName;
  const Tool = toolIndex[toolName]

  const component = <Tool
    context={context}
    config={config[subKey]}
    reportConfig={forwardConfig}
    reportOutput={setValue}
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

  return {
    value, makeView, component
  }
}
