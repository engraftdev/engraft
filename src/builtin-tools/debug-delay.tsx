import { memo, useEffect, useMemo } from "react";
import { hasValue, ProgramFactory, ToolOutput, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useStateSetOnly } from "src/util/state";
import { Program as TangleProgram } from "./tangle";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'debug-delay',
  delayProgram: ToolProgram,
  actualProgram: ToolProgram,
}

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

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'actualProgram'});

  const [delayedOutput, setDelayedOutput] = useStateSetOnly<ToolOutput | null>(null);
  useEffect(() => {
    if (delayMs === 0) {
      setDelayedOutput(actualOutput);
    } else {
      const timeout = setTimeout(() => {
        setDelayedOutput(actualOutput);
      }, delayMs);
      return () => clearTimeout(timeout);
    }
  }, [actualOutput, delayMs, setDelayedOutput]);

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