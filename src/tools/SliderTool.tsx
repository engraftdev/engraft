import { useEffect } from "react";
import { registerTool, ToolProps } from "../tools-framework/tools";
import { updateKeys } from "../util/state";

export interface SliderConfig {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}
export function SliderTool({ config, updateConfig, reportOutput, reportView }: ToolProps<SliderConfig>) {
  useEffect(() => {
    reportOutput({toolValue: config.value});
  }, [config.value, reportOutput]);

  useEffect(() => {
    reportView(() => {
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
    })
    return () => reportView(null);
  }, [config, reportView, updateConfig])

  return null;
}
registerTool(SliderTool, {
  toolName: 'slider',
  value: 0,
  min: -100,
  max: 100,
  step: 1
});