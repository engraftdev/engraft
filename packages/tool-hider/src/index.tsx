import { ComputeReferences, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, ProgramFactory, references, SetOps, ShowView, slotWithCode, slotWithProgram, ToolProgram, ToolRun, ToolView, UsePromiseState, UseUpdateProxy } from "@engraft/toolkit";
import { Program as CheckboxProgram } from "@engraft/tool-checkbox";

// TODO: can this tool ensure that CheckboxProgram is registered, as a
// dependency?

type Program = {
  toolName: 'hider',
  isShownProgram: ToolProgram,
  actualProgram: ToolProgram,
}

const programFactory: ProgramFactory<Program> = (defaultCode) => ({
  toolName: 'hider',
  isShownProgram: slotWithProgram<CheckboxProgram>({
    toolName: 'checkbox',
    checked: true,
  }),
  actualProgram: slotWithCode(defaultCode),
});

const computeReferences: ComputeReferences<Program> = (program) =>
  SetOps.union(references(program.isShownProgram), references(program.actualProgram));

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings } = props;

  const isShownResults = hookRunTool({program: program.isShownProgram, varBindings});
  const actualResults = hookRunTool({program: program.actualProgram, varBindings});

  const outputP = actualResults.outputP;

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>shown?</b>
            <ShowView view={isShownResults.view} updateProgram={programUP.isShownProgram.$} />
          </div>
          <UsePromiseState promise={isShownResults.outputP} children={(isShownOutputState) => {
            if (isShownOutputState.status === 'fulfilled' && isShownOutputState.value.value) {
              return <div className="xRow xGap10">
                <b>y</b>
                <ShowView view={actualResults.view} updateProgram={programUP.actualProgram.$} autoFocus={autoFocus} />
              </div>
            } else {
              return null;
            }
          }}/>
        </div>
      } />
  }), [actualResults.view, isShownResults.outputP, isShownResults.view]);

  return {outputP, view};
}));

export default defineTool({ programFactory, computeReferences, run })
