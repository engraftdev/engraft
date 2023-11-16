import { CollectReferences, EngraftPromise, MakeProgram, ToolOutput, ToolProps, ToolView, defineTool, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

type Program = {
  toolName: 'not-found',
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'not-found',
});

const collectReferences: CollectReferences<Program> = (_program) => [];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { toolName } = props.program;
  const message = `ToolNotFoundError: ${toolName}`;

  const outputP = hookMemo(() => EngraftPromise.reject<ToolOutput>(
    new Error(message)
  ), [message]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(() => <div className="xPad10">{message}</div>),
  }), [message]);

  return { outputP, view };
}));

export default defineTool({ name: 'not-found', makeProgram, collectReferences, run })
