import * as Immutable from "immutable";
import { memo, useCallback, useEffect, useMemo } from "react";
import { Setter, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { lookUpTool, ToolOutput, ToolProgram, ToolView, ToolViewRenderProps } from "./tools";

export function useView(reportView: Setter<ToolView | null>, view: ToolView | null) {
  useEffect(() => {
    reportView(view);
    return () => reportView(null);
  }, [reportView, view])
}

export function useOutput(reportOutput: Setter<ToolOutput | null>, output: ToolOutput | null | undefined) {
  useEffect(() => {
    reportOutput(output || null);
    return () => reportOutput(null);
  }, [reportOutput, output])
}






export interface ShowViewProps extends ToolViewRenderProps {
  view: ToolView | null;
}

export const ShowView = memo(function ShowView({view, ...rest}: ShowViewProps) {
  if (!view) {
    return null;
  }

  return view.render(rest);
})


export interface UseToolProps<C extends ToolProgram> {
  program: C,
  updateProgram: Updater<C>
}

export type UseToolReturn = [
  component: JSX.Element,
  view: ToolView | null,
  output: ToolOutput | null,
]

export function useTool<C extends ToolProgram>({program, updateProgram}: UseToolProps<C>): UseToolReturn {
  const [output, setOutput] = useStateSetOnly<ToolOutput | null>(null)
  const [view, setView] = useStateSetOnly<ToolView | null>(null)

  const toolName = program.toolName;
  const Tool = lookUpTool(toolName);

  const component = <Tool.Component
    program={program}
    updateProgram={updateProgram}
    reportOutput={setOutput}
    reportView={setView}
  />

  return [component, view, output];
}


// for the common case where a tool's program is a key in a super-tool's program

export interface UseSubToolProps<P, K extends keyof P> {
  program: P,
  updateProgram: Updater<P>,
  subKey: K
}

// TODO: doesn't check that the sub-program is actually a toolprogram! dang typing

export function useSubTool<C, K extends string & keyof C>({program, updateProgram, subKey}: UseSubToolProps<C, K>) {
  const [subProgram, updateSubProgram] = useAt(program, updateProgram, subKey);

  return useTool<any>({
    program: subProgram,
    updateProgram: updateSubProgram,
  })
}


export type PerTool<T> = {[key: string]: T}
type PerToolInternal<T> = Immutable.Map<string, T>

export type ToolSet = {
  updateOutputs: Updater<PerToolInternal<ToolOutput | null>>,
  updateViews: Updater<PerToolInternal<ToolView | null>>,
}

export type UseToolSetReturn = [
  toolSet: ToolSet,
  outputs: PerTool<ToolOutput | null>,
  views: PerTool<ToolView | null>,
]

export function useToolSet<C extends ToolProgram>(): UseToolSetReturn {
  const [outputs, updateOutputs] = useStateUpdateOnly<PerToolInternal<ToolOutput | null>>(Immutable.Map())
  const [views, updateViews] = useStateUpdateOnly<PerToolInternal<ToolView | null>>(Immutable.Map())

  const toolSet = useMemo(() => ({updateOutputs, updateViews}), [updateOutputs, updateViews]);
  const outputsObj = useMemo(() => outputs.toObject(), [outputs])
  const viewsObj = useMemo(() => views.toObject(), [views])

  return [toolSet, outputsObj, viewsObj];
}

export type ToolInSetProps<P extends ToolProgram> = {
  toolSet: ToolSet,
  keyInSet: string,
  program: P,
  updateProgram: Updater<P>,
}

const ToolInSetNoMemo = function ToolInSet<P extends ToolProgram>(props: ToolInSetProps<P>) {
  const { toolSet, keyInSet, program, updateProgram } = props;
  const { updateOutputs, updateViews } = toolSet;

  const reportOutput = useCallback((output: ToolOutput | null) => {
    if (output === null) {
      return updateOutputs((oldOutputs) => oldOutputs.delete(keyInSet));
    } else {
      return updateOutputs((oldOutputs) => oldOutputs.set(keyInSet, output));
    }
  }, [keyInSet, updateOutputs])
  const reportView = useCallback((view: ToolView | null) => {
    if (view === null) {
      return updateViews((oldViews) => oldViews.delete(keyInSet));
    } else {
      return updateViews((oldViews) => oldViews.set(keyInSet, view));
    }
  }, [keyInSet, updateViews])

  const toolName = program.toolName;
  const Tool = lookUpTool(toolName);

  return <Tool.Component
    program={program}
    updateProgram={updateProgram}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
};
export const ToolInSet = memo(ToolInSetNoMemo) as typeof ToolInSetNoMemo;
