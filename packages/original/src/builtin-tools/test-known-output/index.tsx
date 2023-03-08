import { EngraftPromise, Tool, ToolOutput } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { ToolOutputView } from "../../view/Value";

export type Program = {
  toolName: 'test-known-output',
  outputP: EngraftPromise<ToolOutput>,  // TODO: for testing, breaks serialization
  onRun?: () => void,  // TODO: for testing, breaks serialization
  onViewRender?: () => void,  // TODO: for testing, breaks serialization
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'test-known-output',
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
        return <div className="TestKnownOutput">
          <ToolOutputView outputP={outputP} />
        </div>;
      }
    }), [onViewRender, outputP]);

    return { outputP, view };
  })),
};

