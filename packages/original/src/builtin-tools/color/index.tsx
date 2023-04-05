import { ComputeReferences, EngraftPromise, ProgramFactory, ToolProps, ToolRun, ToolView } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { RgbColorPicker } from "react-colorful";

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

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program } = props;

  const outputP = hookMemo(() => EngraftPromise.resolve({
    value: `rgb(${program.r}, ${program.g}, ${program.b})`
  }), [program]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <RgbColorPicker color={program} onChange={(color) => updateProgram((old) => ({...old, ...color}))} style={{width: 150, height: 150}}/>
  }), [program]);

  return { outputP, view };
}));
