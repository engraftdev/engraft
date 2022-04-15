import { memo, useCallback } from "react";
import { RgbColorPicker } from 'react-colorful';
import { registerTool, ToolProps, ToolView } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";
import { useMemoObject } from "../util/useMemoObject";

export interface ColorConfig {
  toolName: 'color';
  r: number;
  g: number;
  b: number;
}
export const ColorTool = memo(function ColorTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ColorConfig>) {
  const output = useMemoObject({toolValue: `rgb(${config.r}, ${config.g}, ${config.b})`});
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(() => (
    <div style={{padding: 10}}>
      <RgbColorPicker color={config} onChange={(color) => updateConfig((old) => ({...old, ...color}))} style={{width: 150, height: 150}}/>
    </div>
  ), [config, updateConfig]);
  useView(reportView, view);

  return null;
});
registerTool(ColorTool, 'color', {
  toolName: 'color',
  r: 250,
  g: 200,
  b: 100,
});
