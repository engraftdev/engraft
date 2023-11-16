import { EngraftPromise, ToolView, defineTool, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";

type Program = {
  toolName: 'toy-hello-world-vanilla',
}

export default defineTool<Program>({
  name: 'toy-hello-world-vanilla',

  makeProgram: () => ({
    toolName: 'toy-hello-world-vanilla',
  }),

  collectReferences: (_program) => [],

  run: memoizeProps(hooks((_props) => {
    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: "Output: Hello world!"
    }), []);

    const view: ToolView<Program> = hookMemo(() => ({
      render: (_memory, _props, element) => {
        // do the simplest possible thing (will re-run a lot)
        element.innerHTML = '<h1 style="font-style: italic">View: Hello world!</h1>';
      },
    }), []);

    return { outputP, view };
  })),
});
