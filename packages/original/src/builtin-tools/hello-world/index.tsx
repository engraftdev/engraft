import { EngraftPromise, Tool } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";

export type Program = {
  toolName: 'hello-world',
}

export const tool: Tool<Program> = {
  programFactory: (_defaultInputCode) => ({
    toolName: 'hello-world',
  }),

  computeReferences: (_program) => new Set(),

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