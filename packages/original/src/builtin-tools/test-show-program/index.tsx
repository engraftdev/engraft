import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { ComputeReferences, ProgramFactory, ToolProgram, ToolRun, ToolView } from "../../engraft";
import { hookRunTool } from '../../engraft/hooks';
import { ShowView } from '../../engraft/ShowView';
import { UseUpdateProxy } from "../../util/UpdateProxy.react";
import { ValueEditable } from '../../view/ValueEditable';
import { slotSetTo } from '../slot';

export type Program = {
  toolName: 'test-show-program',
  subProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultInputCode) => ({
  toolName: 'test-show-program',
  subProgram: slotSetTo(defaultInputCode || ''),
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
  }), [program.subProgram]);

  return { outputP, view };
}));
