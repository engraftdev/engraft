import { ComputeReferences, ProgramFactory, ToolRun } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";

export type Program = {
  toolName: "vector-draw";
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: "vector-draw",
});

export const computeReferences: ComputeReferences<Program> = (program) =>
  new Set();

export const run: ToolRun<Program> = memoizeProps(
  hooks((props) => {
    const { program, updateProgram } = props;

    const outputP = hookMemo(
      () =>
        EngraftPromise.resolve({
          value: { vx: 0, vy: 0 },
        }),
      [program]
    );

    const view = hookMemo(
      () => ({
        render: () => <div></div>,
      }),
      [program, updateProgram]
    );

    return { outputP, view };
  })
);
