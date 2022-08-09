import { memo, useCallback } from "react";
import { registerTool, ToolProps, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { updateKeys } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";

export interface SliderProgram {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}
export const SliderTool = memo(function SliderTool({ program, updateProgram, reportOutput, reportView }: ToolProps<SliderProgram>) {
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
registerTool(SliderTool, 'slider', {
  toolName: 'slider',
  value: 0,
  min: -10,
  max: 10,
  step: 1
});
