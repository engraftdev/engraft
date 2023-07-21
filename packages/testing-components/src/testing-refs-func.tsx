import { EngraftPromise, Tool, ToolOutput, ToolProps, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";

// NOTE: program is not serializable
export type Program = {
  toolName: 'testing-refs-func',
  refs: string[],
  func?: (refOutputs: ToolOutput[]) => ToolOutput | EngraftPromise<ToolOutput>,
  onRun?: (props: ToolProps<Program>) => void,
  onViewRender?: () => void,
}

export const tool: Tool<Program> = {
  makeProgram: () => ({
    toolName: 'testing-refs-func',
    refs: [],
    func: () => EngraftPromise.unresolved(),
  }),

  computeReferences: (program) => new Set(program.refs),

  run: memoizeProps(hooks((props) => {
    const { program, varBindings } = props;
    const { refs, func, onRun, onViewRender } = program;

    if (onRun) { onRun(props); }

    const outputP =
      func
      ? EngraftPromise.all(refs.map(ref => varBindings[ref].outputP)).then(func)
      : EngraftPromise.unresolved<ToolOutput>();

    const view = hookMemo(() => ({
      render: () => {
        if (onViewRender) { onViewRender(); }
        return null;
      }
    }), [onViewRender]);

    return { outputP, view };
  })),
};

export default tool;
