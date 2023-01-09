import { memo, useEffect, useMemo, useState } from "react";
import { references, ProgramFactory, ComputeReferences, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'debug-change-counter',
  actualProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'debug-change-counter',
  actualProgram: slotSetTo(defaultCode || ''),
});

export const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.actualProgram);

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'actualProgram'});

  const [varsChangeCount, setVarsChangeCount] = useState(0);
  const [outputChangeCount, setOutputChangeCount] = useState(0);
  const [viewChangeCount, setViewChangeCount] = useState(0);

  useEffect(() => {
    setVarsChangeCount((varsChangeCount) => varsChangeCount + 1);
  }, [varBindings]);

  useEffect(() => {
    setOutputChangeCount((outputChangeCount) => outputChangeCount + 1);
  }, [actualOutput]);

  useEffect(() => {
    setViewChangeCount((viewChangeCount) => viewChangeCount + 1);
  }, [actualView]);

  useOutput(reportOutput, actualOutput);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>→ vars</b>
          <div>{varsChangeCount}</div>
        </div>
        <div className="xRow xGap10">
          <b>← output</b>
          <div>{outputChangeCount}</div>
        </div>
        <div className="xRow xGap10">
          <b>← view</b>
          <div>{viewChangeCount}</div>
        </div>
        <ShowView view={actualView} />
      </div>
  }), [actualView, varsChangeCount, outputChangeCount, viewChangeCount]));

  return <>
    {actualComponent}
  </>
});
