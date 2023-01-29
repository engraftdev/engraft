import { Tool } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";

export type Program = {
  toolName: 'checkbox',
  checked: boolean,
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'checkbox',
    checked: false,
  }),

  computeReferences: () => new Set(),

  run: memoizeProps(hooks((props) => {
    const { program, updateProgram } = props;

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: program.checked
    }), [program.checked]);

    const view = hookMemo(() => ({
      render: () =>
        <input
          type="checkbox"
          checked={program.checked}
          onChange={(e) => {
            updateProgram((old) => ({...old, checked: e.target.checked}))
          }}
        />
    }), [program.checked, updateProgram]);

    return { outputP, view };
  })),
};

