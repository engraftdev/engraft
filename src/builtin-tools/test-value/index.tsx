import { Tool } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";

export type Program = {
  toolName: 'test-value',
  value: unknown,
  onRun?: () => void,  // TODO: for testing, breaks serialization
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'test-value',
    value: null,
  }),

  computeReferences: () => new Set(),

  run: memoizeProps(hooks((props) => {
    const { program } = props;
    const { value, onRun } = program;

    if (onRun) { onRun(); }

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value
    }), [value]);

    const view = hookMemo(() => ({
      render: () => null  // TODO: add a view
    }), []);

    return { outputP, view };
  })),
};

