import * as Immutable from "immutable";
import { memo, useCallback, useEffect, useMemo } from "react";
import { Setter, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { lookUpTool, ToolProgram, ToolOutput, ToolView, ToolViewRenderProps } from "./tools";

export function useView(reportView: Setter<ToolView | null>, view: ToolView) {
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

export type UseToolsReturn = [
  components: PerTool<JSX.Element>,
  views: PerTool<ToolView | null>,
  outputs: PerTool<ToolOutput | null>,
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

export function useTools<C extends ToolProgram>(tools: {[key: string]: UseToolProps<C>}): UseToolsReturn {
  const [outputs, updateOutputs] = useStateUpdateOnly<PerToolInternal<ToolOutput | null>>(Immutable.Map())
  const [views, updateViews] = useStateUpdateOnly<PerToolInternal<ToolView | null>>(Immutable.Map())

  useEffect(() => {
    updateOutputs((oldOutputs) => cleanUpOldProperties(oldOutputs, tools));
    updateViews((oldViews) => cleanUpOldProperties(oldViews, tools));
  }, [tools, updateOutputs, updateViews])

  const components = Object.fromEntries(Object.entries(tools).map(([keyName, {program, updateProgram}]) => {
    return [keyName, <ToolAt
      key={keyName}
      keyName={keyName}
      program={program}
      updateProgram={updateProgram as unknown as Updater<ToolProgram>}
      updateOutputs={updateOutputs}
      updateViews={updateViews}
    />]
  }))

  const viewsObj = useMemo(() => views.toObject(), [views])
  const outputsObj = useMemo(() => outputs.toObject(), [outputs])

  return [components, viewsObj, outputsObj];
}

interface ToolAtProps {
  keyName: string,
  program: ToolProgram,
  updateProgram: Updater<ToolProgram>
  updateOutputs: Updater<PerToolInternal<ToolOutput | null>>,
  updateViews: Updater<PerToolInternal<ToolView | null>>,
}

const ToolAt = memo(function ToolAt({keyName, updateOutputs, updateViews, program, updateProgram}: ToolAtProps) {
  const reportOutput = useCallback((output: ToolOutput | null) => {
    return updateOutputs((oldOutputs) => oldOutputs.set(keyName, output));
  }, [keyName, updateOutputs])
  const reportView = useCallback((view: ToolView | null) => {
    return updateViews((oldViews) => oldViews.set(keyName, view));
  }, [keyName, updateViews])

  // TODO: use useEffect to clean up after ourselves?

  const toolName = program.toolName;
  const Tool = lookUpTool(toolName);

  return <Tool.Component
    program={program}
    updateProgram={updateProgram}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})
