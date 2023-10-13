import { CollectReferences, MakeProgram, ShowView, ToolProgram, ToolRun, ToolView, UseUpdateProxy, defineTool, hookMemo, hookRef, hookRunTool, hooks, memoizeProps, slotWithCode } from "@engraft/toolkit";

type Program = {
  toolName: 'test-count-runs',
  subProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (defaultInputCode) => ({
  toolName: 'test-count-runs',
  subProgram: slotWithCode(defaultInputCode || ''),
});

const collectReferences: CollectReferences<Program> = (program) => program.subProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings} = props;

  const subResult = hookRunTool({program: program.subProgram, varBindings})

  const outputP = subResult.outputP;

  const numRuns = hookRef(() => 0);
  numRuns.current++;

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xPad10 xGap10">
          <div className="xRow xGap10">
            <b>runs</b>
            <div>{numRuns.current}</div>
          </div>
          <ShowView view={subResult.view} updateProgram={programUP.subProgram.$apply} />
        </div>
      } />
  }), [numRuns, subResult.view]);

  return {outputP, view};
}));

export default defineTool({ makeProgram, collectReferences, run })
