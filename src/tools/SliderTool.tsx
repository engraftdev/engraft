import { useCallback, useMemo } from "react";
import { registerTool, ToolProps } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";
import { updateKeys } from "../util/state";

export interface SliderConfig {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}
export function SliderTool({ config, updateConfig, reportOutput, reportView }: ToolProps<SliderConfig>) {
  const output = useMemo(() => ({toolValue: config.value}), [config.value]);
  useOutput(reportOutput, output);

  const render = useCallback(() => {
    return (
      <div className="App">
        <input
          type="range"
          value={config.value}
          onChange={(e) => updateKeys(updateConfig, { value: +e.target.value })}
          min={config.min} max={config.max} step={config.step}/>
        {' '}{config.value}
      </div>
    );
  }, [config.max, config.min, config.step, config.value, updateConfig]);
  useView(reportView, render, config);

  return null;
}
registerTool(SliderTool, {
  toolName: 'slider',
  value: 0,
  min: -100,
  max: 100,
  step: 1
});