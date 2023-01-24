import { ComputeReferences, ProgramFactory, ToolProgram, ToolRun, ToolView } from "src/engraft";
import { hookRunTool } from 'src/engraft/hooks';
import { ShowView } from 'src/engraft/ShowView';
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { hookAt } from "src/util/immutable-mento";
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
  const { program, updateProgram, varBindings} = props;

  const [ subProgram, updateSubProgram ] = hookAt(program, updateProgram, 'subProgram');
  const subResult = hookRunTool({program: subProgram, updateProgram: updateSubProgram, varBindings})

  const outputP = subResult.outputP;

  const view: ToolView = hookMemo(() => ({
    render: (renderProps) =>
      <div className="xCol xPad10 xGap10">
        <ShowView view={subResult.view} {...renderProps} />
        <ValueEditable value={subProgram} updater={updateSubProgram}/>
      </div>
  }), [program, updateProgram]);

  return { outputP, view };
}));
