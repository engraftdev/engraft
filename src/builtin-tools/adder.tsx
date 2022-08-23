import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
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

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [xComponent, xView, xOutput] = useSubTool({program, updateProgram, subKey: 'xProgram'});
  const [yComponent, yView, yOutput] = useSubTool({program, updateProgram, subKey: 'yProgram'});

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
          <ShowView view={xView} />
        </div>

        <div className="xRow xGap10">
          <b>y</b>
          <ShowView view={yView} />
        </div>
      </div>
  }), [xView, yView]));

  return <>
    {xComponent}
    {yComponent}
  </>
});
