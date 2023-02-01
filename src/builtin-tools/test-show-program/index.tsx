import { ComputeReferences, ProgramFactory, ToolProgram, ToolRun, ToolView } from "src/engraft";
import { hookRunTool } from 'src/engraft/hooks';
import { ShowView } from 'src/engraft/ShowView';
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { UseUpdateProxy } from "src/util/UpdateProxy.react";
import { ValueEditable } from 'src/view/ValueEditable';
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
