import { EngraftPromise, Tool, ToolOutput, ToolOutputView, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";

export type Program = {
  toolName: 'testing-known-output',
  outputP: EngraftPromise<ToolOutput>,  // TODO: for testing, breaks serialization
  onRun?: () => void,  // TODO: for testing, breaks serialization
  onViewRender?: () => void,  // TODO: for testing, breaks serialization
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'testing-known-output',
    outputP: EngraftPromise.unresolved(),
  }),

  computeReferences: () => new Set(),

  run: memoizeProps(hooks((props) => {
    const { program } = props;
    const { outputP, onRun, onViewRender } = program;

    if (onRun) { onRun(); }

    const view = hookMemo(() => ({
      render: () => {
        if (onViewRender) { onViewRender(); }
        return <div className="TestingKnownOutput">
          <ToolOutputView outputP={outputP} />
        </div>;
      }
    }), [onViewRender, outputP]);

    return { outputP, view };
  })),
};
