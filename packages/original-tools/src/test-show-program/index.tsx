import { ComputeReferences, hookRunTool, ProgramFactory, ShowView, slotWithCode, ToolProgram, ToolRun, ToolView } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { UseUpdateProxy } from "@engraft/update-proxy-react";
import { ValueEditable } from "@engraft/core-widgets";

export type Program = {
  toolName: 'test-show-program',
  subProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultInputCode) => ({
  toolName: 'test-show-program',
  subProgram: slotWithCode(defaultInputCode || ''),
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings} = props;

  const subResult = hookRunTool({program: program.subProgram, varBindings})

  const outputP = subResult.outputP;

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xPad10 xGap10">
          <ShowView view={subResult.view} updateProgram={programUP.subProgram.$apply} />
          <ValueEditable value={program.subProgram} updater={programUP.subProgram.$apply}/>
        </div>
      } />
  }), [program.subProgram, subResult.view]);

  return { outputP, view };
}));
