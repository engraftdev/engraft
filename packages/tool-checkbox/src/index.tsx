import { defineTool, EngraftPromise, hookMemo, hooks, memoizeProps, ToolView } from "@engraft/toolkit";

export type Program = {
  toolName: 'checkbox',
  checked: boolean,
}

export default defineTool<Program>({
  makeProgram: () => ({
    toolName: 'checkbox',
    checked: false,
  }),

  collectReferences: () => [],

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
});
