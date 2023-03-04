import { ComputeReferences, defineTool, EngraftPromise, hookMemo, hookRunTool, hooks, memoizeProps, ProgramFactory, references, SetOps, ShowView, slotWithCode, ToolProgram, ToolProps, ToolView, UseUpdateProxy } from "@engraft/toolkit";

export type Program = {
  toolName: 'toy-adder',
  xProgram: ToolProgram,
  yProgram: ToolProgram,
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'toy-adder',
  xProgram: slotWithCode(''),
  yProgram: slotWithCode(''),
});

const computeReferences: ComputeReferences<Program> = (program) =>
  SetOps.union(references(program.xProgram), references(program.yProgram));

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
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

export default defineTool({ programFactory, computeReferences, run })
