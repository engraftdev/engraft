import { ComputeReferences, ProgramFactory, references, ToolProgram, ToolProps, ToolView } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { union } from "src/util/sets";
import { UseUpdateProxy } from "src/util/UpdateProxy.react";
import { slotSetTo } from "../slot";

export type Program = {
  toolName: 'toy-adder';
  xProgram: ToolProgram;
  yProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'toy-adder',
  xProgram: slotSetTo(''),
  yProgram: slotSetTo(''),
});

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.xProgram), references(program.yProgram));

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const {outputP: xOutputP, view: xView} = hookRunTool({program: program.xProgram, varBindings});
  const {outputP: yOutputP, view: yView} = hookRunTool({program: program.yProgram, varBindings});

  const outputP = hookMemo(() => EngraftPromise.all([xOutputP, yOutputP]).then(([xOutput, yOutput]) => {
    if (typeof xOutput.value !== 'number') { throw new Error('x must be a number'); }
    if (typeof yOutput.value !== 'number') { throw new Error('y must be a number'); }
    return {value: xOutput.value + yOutput.value};
  }), [xOutputP, yOutputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>x</b>
            <ShowView view={xView} updateProgram={programUP.xProgram.$apply} autoFocus={autoFocus} />
          </div>

          <div className="xRow xGap10">
            <b>y</b>
            <ShowView view={yView} updateProgram={programUP.yProgram.$apply} />
          </div>
        </div>
      } />
  }), [xView, yView]);

  return {outputP, view};
}));
