import { EngraftPromise, ToolView, defineTool, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

type Program = {
  toolName: 'toy-hello-world',
}

export default defineTool<Program>({
  name: 'toy-hello-world',

  makeProgram: () => ({
    toolName: 'toy-hello-world',
  }),

  collectReferences: (_program) => [],

  run: memoizeProps(hooks((_props) => {
    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: "Output: Hello world!"
    }), []);

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact(() => <h1 style={{fontStyle: 'italic'}}>View: Hello world!</h1>)
    }), []);

    return { outputP, view };
  })),
});
