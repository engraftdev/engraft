import { ComputeReferences, ProgramFactory, ToolProps } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";

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

  const outputP = hookMemo(() => EngraftPromise.reject(
    new Error(message)
  ), []);

  const view = hookMemo(() => ({
    render: () => <div className="xPad10">{message}</div>
  }), []);

  return { outputP, view };
}));
