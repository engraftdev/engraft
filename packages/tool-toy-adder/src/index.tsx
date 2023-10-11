import { CollectReferences, EngraftPromise, MakeProgram, ShowView, ToolProgram, ToolProps, ToolView, UseUpdateProxy, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, slotWithCode } from "@engraft/toolkit";

export type Program = {
  toolName: 'toy-adder',
  xProgram: ToolProgram,
  yProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'toy-adder',
  xProgram: slotWithCode(''),
  yProgram: slotWithCode(''),
});

const collectReferences: CollectReferences<Program> = (program) => [ program.xProgram, program.yProgram ];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const xResults = hookRunTool({program: program.xProgram, varBindings});
  const yResults = hookRunTool({program: program.yProgram, varBindings});

  const outputP = hookMemo(() =>
    EngraftPromise.all([xResults.outputP, yResults.outputP])
      .then(([xOutput, yOutput]) => {
        if (typeof xOutput.value !== 'number') { throw new Error('x must be a number'); }
        if (typeof yOutput.value !== 'number') { throw new Error('y must be a number'); }
        return {value: xOutput.value + yOutput.value};
      })
  , [xResults.outputP, yResults.outputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>x</b>
            <ShowView
              view={xResults.view}
              updateProgram={programUP.xProgram.$apply}
              autoFocus={autoFocus}
            />
          </div>

          <div className="xRow xGap10">
            <b>y</b>
            <ShowView
              view={yResults.view}
              updateProgram={programUP.yProgram.$apply}
            />
          </div>
        </div>
      } />
  }), [xResults.view, yResults.view]);

  return {outputP, view};
}));

export default defineTool({ makeProgram, collectReferences, run })
