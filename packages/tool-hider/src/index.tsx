import { Program as CheckboxProgram } from "@engraft/tool-checkbox";
import { CollectReferences, MakeProgram, ShowView, ToolProgram, ToolRun, ToolView, UsePromiseState, UseUpdateProxy, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

// TODO: can this tool ensure that CheckboxProgram is registered, as a
// dependency?

type Program = {
  toolName: 'hider',
  isShownProgram: ToolProgram,
  actualProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context, defaultCode) => ({
  toolName: 'hider',
  isShownProgram: context.makeSlotWithProgram({
    toolName: 'checkbox',
    checked: true,
  } satisfies CheckboxProgram),
  actualProgram: context.makeSlotWithCode(defaultCode),
});

const collectReferences: CollectReferences<Program> = (program) => [ program.isShownProgram, program.actualProgram ];

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings, context } = props;

  const isShownResults = hookRunTool({program: program.isShownProgram, varBindings, context});
  const actualResults = hookRunTool({program: program.actualProgram, varBindings, context});

  const outputP = actualResults.outputP;

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus}) =>
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
    ),
  }), [actualResults.view, isShownResults.outputP, isShownResults.view]);

  return {outputP, view};
}));

export default defineTool({ name: "hider", makeProgram, collectReferences, run })
