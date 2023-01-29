import { ComputeReferences, ProgramFactory, references, ToolProgram, ToolProps, ToolView } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunSubTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { union } from "src/util/sets";
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
  const { program, updateProgram, varBindings } = props;

  const {outputP: xOutputP, view: xView} = hookRunSubTool({program, updateProgram, subKey: 'xProgram', varBindings});
  const {outputP: yOutputP, view: yView} = hookRunSubTool({program, updateProgram, subKey: 'yProgram', varBindings});

  const outputP = EngraftPromise.all([xOutputP, yOutputP]).then(([xOutput, yOutput]) => {
    if (typeof xOutput.value !== 'number') { throw new Error('x must be a number'); }
    if (typeof yOutput.value !== 'number') { throw new Error('y must be a number'); }
    return {value: xOutput.value + yOutput.value};
  });

  const view: ToolView = {
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>x</b>
          <ShowView view={xView} autoFocus={autoFocus} />
        </div>

        <div className="xRow xGap10">
          <b>y</b>
          <ShowView view={yView} />
        </div>
      </div>,
  };

  return {outputP, view};
}));


