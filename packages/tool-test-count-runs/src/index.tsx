import { CollectReferences, MakeProgram, ShowView, ToolProgram, ToolRun, ToolView, defineTool, hookMemo, hookRef, hookRunTool, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";

type Program = {
  toolName: 'test-count-runs',
  subProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context, defaultInputCode) => ({
  toolName: 'test-count-runs',
  subProgram: context.makeSlotWithCode(defaultInputCode || ''),
});

const collectReferences: CollectReferences<Program> = (program) => program.subProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings, context } = props;

  const subResult = hookRunTool({program: program.subProgram, varBindings, context})

  const outputP = subResult.outputP;

  const numRuns = hookRef(() => 0);
  numRuns.current++;

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram}) =>
      <div className="xCol xPad10 xGap10">
        <div className="xRow xGap10">
          <b>runs</b>
          <div>{numRuns.current}</div>
        </div>
        <ShowView view={subResult.view} updateProgram={up(updateProgram).subProgram.$apply} />
      </div>
    ),
  }), [numRuns, subResult.view]);

  return {outputP, view};
}));

export default defineTool({ name: 'test-count-runs', makeProgram, collectReferences, run })
