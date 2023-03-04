import { EngraftPromise, Tool } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";

export type Program = {
  toolName: 'test-value',
  value: unknown,
  onRun?: () => void,  // TODO: for testing, breaks serialization
  onViewRender?: () => void,  // TODO: for testing, breaks serialization
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'test-value',
    value: null,
  }),

  computeReferences: () => new Set(),

  run: memoizeProps(hooks((props) => {
    const { program } = props;
    const { value, onRun, onViewRender } = program;

    if (onRun) { onRun(); }

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value
    }), [value]);

    const view = hookMemo(() => ({
      render: () => {
        if (onViewRender) { onViewRender(); }
        return <div className="TestValue">{JSON.stringify(program.value)}</div>;
      }
    }), [onViewRender, program.value]);

    return { outputP, view };
  })),
};

