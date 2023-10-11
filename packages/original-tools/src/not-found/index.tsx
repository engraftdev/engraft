import { CollectReferences, EngraftPromise, MakeProgram, ToolOutput, ToolProps } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";

export type Program = {
  toolName: 'not-found',
}

export const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'not-found',
});

export const collectReferences: CollectReferences<Program> = (_program) => [];

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
