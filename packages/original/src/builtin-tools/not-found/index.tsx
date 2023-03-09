import { ComputeReferences, EngraftPromise, ProgramFactory, ToolOutput, ToolProps } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";

export type Program = {
  toolName: 'not-found',
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'not-found',
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { toolName } = props.program;
  const message = `ToolNotFoundError: ${toolName}`;

  const outputP = hookMemo(() => EngraftPromise.reject<ToolOutput>(
    new Error(message)
  ), [message]);

  const view = hookMemo(() => ({
    render: () => <div className="xPad10">{message}</div>
  }), [message]);

  return { outputP, view };
}));
