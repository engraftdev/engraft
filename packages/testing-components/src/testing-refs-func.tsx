import { EngraftPromise, Tool, ToolOutput, ToolProps, ToolView, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";
import { Fragment } from "react";

// NOTE: program is not serializable
export type Program = {
  toolName: 'testing-refs-func',
  refs: string[],
  func?: (refOutputs: ToolOutput[]) => ToolOutput | EngraftPromise<ToolOutput>,
  onRun?: (props: ToolProps<Program>) => void,
  onViewRender?: () => void,
}

export const tool: Tool<Program> = {
  name: 'testing-refs-func',

  makeProgram: () => ({
    toolName: 'testing-refs-func',
    refs: [],
    func: () => EngraftPromise.unresolved(),
  }),

  collectReferences: (program) => program.refs.map(id => ({ id })),

  run: memoizeProps(hooks((props) => {
    const { program, varBindings } = props;
    const { refs, func, onRun, onViewRender } = program;

    if (onRun) { onRun(props); }

    const outputP =
      func
      ? EngraftPromise.all(refs.map(ref => varBindings[ref].outputP)).then(func)
      : EngraftPromise.unresolved<ToolOutput>();

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact(() => {
        if (onViewRender) { onViewRender(); }
        return <Fragment/>;
      }),
    }), [onViewRender]);

    return { outputP, view };
  })),
};

export default tool;
