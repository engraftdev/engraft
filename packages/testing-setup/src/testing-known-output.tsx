import { EngraftPromise, Tool, ToolOutput, ToolOutputView, ToolView, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

export type Program = {
  toolName: 'testing-known-output',
  outputP: EngraftPromise<ToolOutput>,  // TODO: for testing, breaks serialization
  onRun?: () => void,  // TODO: for testing, breaks serialization
  onViewRender?: () => void,  // TODO: for testing, breaks serialization
}

export const tool: Tool<Program> = {
  name: 'testing-known-output',

  makeProgram: () => ({
    toolName: 'testing-known-output',
    outputP: EngraftPromise.unresolved(),
  }),

  collectReferences: () => [],

  run: memoizeProps(hooks((props) => {
    const { program } = props;
    const { outputP, onRun, onViewRender } = program;

    if (onRun) { onRun(); }

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact(() => {
        if (onViewRender) { onViewRender(); }
        return <div className="TestingKnownOutput">
          <ToolOutputView outputP={outputP} />
        </div>;
      }),
    }), [onViewRender, outputP]);

    return { outputP, view };
  })),
};
