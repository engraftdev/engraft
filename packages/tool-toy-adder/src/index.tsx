import { CollectReferences, EngraftPromise, MakeProgram, ShowView, ToolProgram, ToolProps, ToolView, UseUpdateProxy, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

export type Program = {
  toolName: 'toy-adder',
  xProgram: ToolProgram,
  yProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context) => ({
  toolName: 'toy-adder',
  xProgram: context.makeSlotWithCode(''),
  yProgram: context.makeSlotWithCode(''),
});

const collectReferences: CollectReferences<Program> = (program) => [ program.xProgram, program.yProgram ];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const xResults = hookRunTool({program: program.xProgram, varBindings, context});
  const yResults = hookRunTool({program: program.yProgram, varBindings, context});

  const outputP = hookMemo(() =>
    EngraftPromise.all([xResults.outputP, yResults.outputP])
      .then(([xOutput, yOutput]) => {
        if (typeof xOutput.value !== 'number') { throw new Error('x must be a number'); }
        if (typeof yOutput.value !== 'number') { throw new Error('y must be a number'); }
        return {value: xOutput.value + yOutput.value};
      })
  , [xResults.outputP, yResults.outputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus}) =>
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
    ),
  }), [xResults.view, yResults.view]);

  return {outputP, view};
}));

export default defineTool({ name: 'toy-adder', makeProgram, collectReferences, run })
