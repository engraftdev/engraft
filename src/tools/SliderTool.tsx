import { useEffect } from "react";
import { setKeys } from "../util/setKeys";
import { registerTool, ToolProps } from "../tools-framework/tools";

export interface SliderConfig {
  toolName: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
}
export function SliderTool({ config, reportConfig, reportOutput, reportView }: ToolProps<SliderConfig>) {
  useEffect(() => {
    reportOutput.set({toolValue: config.value});
  }, [config.value, reportOutput]);

  useEffect(() => {
    reportView.set(() => {
      return (
        <div className="App">
          <input
            type="range"
            value={config.value}
            onChange={(e) => reportConfig.update(setKeys({ value: +e.target.value }))}
            min={config.min} max={config.max} step={config.step}/>
          {' '}{config.value}
        </div>
      );
    })
    return () => reportView.set(null);
  }, [config, reportView, reportConfig])
  // useWhatChanged([config, reportView, reportConfig], 'config, reportView, reportConfig')

  return null;
}
registerTool(SliderTool, {
  toolName: 'slider',
  value: 0,
  min: -100,
  max: 100,
  step: 1
});