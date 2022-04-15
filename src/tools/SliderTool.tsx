import { memo, useCallback } from "react";
import { registerTool, ToolProps, ToolView } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";
import { updateKeys } from "../util/state";
import { useMemoObject } from "../util/useMemoObject";

export interface SliderConfig {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}
export const SliderTool = memo(function SliderTool({ config, updateConfig, reportOutput, reportView }: ToolProps<SliderConfig>) {
  const output = useMemoObject({toolValue: config.value});
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(() => (
    <div style={{padding: 10}}>
      <input
        type="range"
        value={config.value}
        onChange={(e) => updateKeys(updateConfig, { value: +e.target.value })}
        min={config.min} max={config.max} step={config.step}/>
      {' '}
      <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{config.value}</div>
    </div>
  ), [config.max, config.min, config.step, config.value, updateConfig]);
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
