import { memo, useMemo } from "react";
import { hasValue, references, ProgramFactory, ComputeReferences, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { union } from "src/util/sets";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'adder';
  xProgram: ToolProgram;
  yProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'adder',
  xProgram: slotSetTo(''),
  yProgram: slotSetTo(''),
});

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.xProgram), references(program.yProgram));

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [xComponent, xView, xOutput] = useSubTool({program, updateProgram, subKey: 'xProgram', varBindings});
  const [yComponent, yView, yOutput] = useSubTool({program, updateProgram, subKey: 'yProgram', varBindings});

  useOutput(reportOutput, useMemo(() => {
    if (hasValue(xOutput) && hasValue(yOutput)) {
      return {value: (xOutput.value as any) + (yOutput.value as any)};
    }
  }, [xOutput, yOutput]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>x</b>
          {xView && xView.render({})}
        </div>

        <div className="xRow xGap10">
          <b>y</b>
          {yView && yView.render({})}
        </div>
      </div>
  }), [xView, yView]));

  return <>
    {xComponent}
    {yComponent}
  </>
});
