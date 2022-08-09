import { memo, useCallback, useMemo } from "react";
import { registerTool, ToolProgram, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { codeProgramSetTo } from "./CodeTool";

export interface AdderProgram extends ToolProgram {
  toolName: 'adder';
  xProgram: ToolProgram;
  yProgram: ToolProgram;
}

export const AdderTool = memo(function AdderTool({ program, updateProgram, reportOutput, reportView }: ToolProps<AdderProgram>) {
  const [xComponent, xView, xOutput] = useSubTool({program, updateProgram, subKey: 'xProgram'});
  const [yComponent, yView, yOutput] = useSubTool({program, updateProgram, subKey: 'yProgram'});

  const output = useMemo(() => {
    if (xOutput && yOutput) {
      return {toolValue: (xOutput.toolValue as any) + (yOutput.toolValue as any)};
    }
  }, [xOutput, yOutput])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(({autoFocus}) => (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>x</b>
        <ShowView view={xView} autoFocus={autoFocus} />
      </div>

      <div className="xRow xGap10">
        <b>y</b>
        <ShowView view={yView} />
      </div>
    </div>
  ), [xView, yView]);
  useView(reportView, view);

  return <>
    {xComponent}
    {yComponent}
  </>
});

registerTool<AdderProgram>(AdderTool, 'adder', () => ({
  toolName: 'adder',
  xProgram: codeProgramSetTo(''),
  yProgram: codeProgramSetTo(''),
}));
