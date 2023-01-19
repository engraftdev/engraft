import { ComputeReferences, ProgramFactory, ToolProps } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { EngraftStream } from "src/engraft/EngraftStream";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";

export type Program = {
  toolName: 'checkbox',
  checked: boolean,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'checkbox',
  checked: false,
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, updateProgram } = props;

  // console.log("running checkbox", program);

  const outputP = hookMemo(() => EngraftPromise.resolve({
    value: program.checked
  }), [program.checked]);

  const viewS = hookMemo(() => EngraftStream.of({
    render: () =>
      <input
        type="checkbox"
        checked={program.checked}
        onChange={(e) => {
          updateProgram((old) => ({...old, checked: e.target.checked}))
        }}
      />
  }), [program.checked, updateProgram]);

  return { outputP, viewS };
}));
