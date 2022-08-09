import { memo, useCallback } from "react";
import { RgbColorPicker } from 'react-colorful';
import { ProgramFactory, ToolProps, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useMemoObject } from "src/util/useMemoObject";

export interface Program {
  toolName: 'color';
  r: number;
  g: number;
  b: number;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'color',
  r: 250,
  g: 200,
  b: 100,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

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

