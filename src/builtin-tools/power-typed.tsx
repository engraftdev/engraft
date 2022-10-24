import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'power-typed';
  baseProgram: ToolProgram;
  exponent: number;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'power-typed',
  baseProgram: slotSetTo(''),
  exponent: 1,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [baseComponent, baseView, baseOutput] =
    useSubTool({program, updateProgram, subKey: 'baseProgram', varBindings});

  useOutput(reportOutput, useMemo(() => {
    if (hasValue(baseOutput)) {
      return {value: (baseOutput.value as any) ** program.exponent};
    }
  }, [baseOutput, program.exponent]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>base</b>
          <ShowView view={baseView} />
        </div>

        <div className="xRow xGap10">
          <b>exponent</b>
          <input
            type="range"
            value={program.exponent} min={0} max={3} step={1}
            onChange={(e) =>
              updateProgram((old) => ({...old, exponent: +e.target.value}))}/>
          {program.exponent}
        </div>
      </div>
  }), [baseView, program.exponent, updateProgram]));

  return baseComponent;
});
