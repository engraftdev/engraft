import { memo, useCallback } from "react";
import { ProgramFactory, ToolProps, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { updateKeys } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";


export interface Program {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'slider',
  value: 0,
  min: -10,
  max: 10,
  step: 1,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const output = useMemoObject({toolValue: program.value});
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(() => (
    <div style={{padding: 10}}>
      <input
        type="range"
        value={program.value}
        onChange={(e) => updateKeys(updateProgram, { value: +e.target.value })}
        min={program.min} max={program.max} step={program.step}/>
      {' '}
      <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{program.value}</div>
    </div>
  ), [program.max, program.min, program.step, program.value, updateProgram]);
  useView(reportView, view);

  return null;
})

