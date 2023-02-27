import { Tool, ToolView } from "../../engraft";
import { EngraftPromise } from "../../engraft/EngraftPromise";
import { hookMemo } from "../../incr/hookMemo";
import { hooks } from "../../incr/hooks";
import { memoizeProps } from "../../incr/memoize";

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
    const { program } = props;

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: program.checked
    }), [program.checked]);

    const view: ToolView<Program> = hookMemo(() => ({
      render: ({updateProgram}) =>
        <input
          type="checkbox"
          checked={program.checked}
          onChange={(e) => {
            updateProgram((old) => ({...old, checked: e.target.checked}))
          }}
        />
    }), [program.checked]);

    return { outputP, view };
  })),
};

