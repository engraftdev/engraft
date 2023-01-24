import { RgbColorPicker } from 'react-colorful';
import { ComputeReferences, ProgramFactory, ToolRun } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";

export type Program = {
  toolName: 'color',
  r: number,
  g: number,
  b: number,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'color',
  r: 250,
  g: 200,
  b: 100,
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, updateProgram} = props;

  const outputP = hookMemo(() => EngraftPromise.resolve({
    value: `rgb(${program.r}, ${program.g}, ${program.b})`
  }), [program]);

  const view = hookMemo(() => ({
    render: () =>
      <RgbColorPicker color={program} onChange={(color) => updateProgram((old) => ({...old, ...color}))} style={{width: 150, height: 150}}/>
  }), [program, updateProgram]);

  return { outputP, view };
}));
