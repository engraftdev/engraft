import { EngraftPromise, Tool } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";

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

    const view = hookMemo(() => ({
      render: () => <h1 style={{fontStyle: 'italic'}}>View: Hello world!</h1>
    }), []);

    return { outputP, view };
  })),
};
