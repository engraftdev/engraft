import { memo, useEffect, useMemo } from "react";
import { hasValue, references, ProgramFactory, ComputeReferences, ToolOutput, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useStateSetOnly } from "src/util/state";
import { Program as TangleProgram } from "./tangle";
import { slotSetTo } from "./slot";
import { union } from "src/util/sets";
import { useRefForCallback } from "src/util/useRefForCallback";

export type Program = {
  toolName: 'debug-delay',
  delayProgram: ToolProgram,
  actualProgram: ToolProgram,
}

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.delayProgram), references(program.actualProgram));

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'debug-delay',
  delayProgram: slotSetTo<TangleProgram>({
    toolName: 'tangle',
    min: 0,
    max: 5000,
    step: 100,
    value: 1000,
  }),
  actualProgram: slotSetTo(defaultCode || ''),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [delayComponent, delayView, delayOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'delayProgram'});
  const delayMs: number = hasValue(delayOutput) && typeof delayOutput.value === 'number' ? delayOutput.value : 0;
  const delayMsRef = useRefForCallback(delayMs);

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'actualProgram'});

  const [delayedOutput, setDelayedOutput] = useStateSetOnly<ToolOutput | null>(null);
  useEffect(() => {
    if (delayMsRef.current === 0) {
      setDelayedOutput(actualOutput);
    } else {
      setDelayedOutput(null);
      const timeout = setTimeout(() => {
        setDelayedOutput(actualOutput);
      }, delayMsRef.current);
      return () => clearTimeout(timeout);
    }
  }, [actualOutput, delayMsRef, setDelayedOutput]);

  useOutput(reportOutput, delayedOutput);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>delay</b>
          <ShowView view={delayView} />
          ms
        </div>
        <ShowView view={actualView} />
      </div>
  }), [actualView, delayView]));

  return <>
    {delayComponent}
    {actualComponent}

  </>
});
