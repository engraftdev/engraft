import { EngraftPromise, Tool, ToolView, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

export type Program = {
  toolName: 'hello-world',
}

export const tool: Tool<Program> = {
  name: 'hello-world',

  makeProgram: (_defaultInputCode) => ({
    toolName: 'hello-world',
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
};
