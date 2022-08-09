import { memo, useCallback } from "react";
import { RgbColorPicker } from 'react-colorful';
import { registerTool, ToolProps, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useMemoObject } from "src/util/useMemoObject";

export interface ColorProgram {
  toolName: 'color';
  r: number;
  g: number;
  b: number;
}
export const ColorTool = memo(function ColorTool({ program, updateProgram, reportOutput, reportView }: ToolProps<ColorProgram>) {
  const output = useMemoObject({toolValue: `rgb(${program.r}, ${program.g}, ${program.b})`});
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(() => (
    <div style={{padding: 10}}>
      <RgbColorPicker color={program} onChange={(color) => updateProgram((old) => ({...old, ...color}))} style={{width: 150, height: 150}}/>
    </div>
  ), [program, updateProgram]);
  useView(reportView, view);

  return null;
});
registerTool(ColorTool, 'color', {
  toolName: 'color',
  r: 250,
  g: 200,
  b: 100,
});
