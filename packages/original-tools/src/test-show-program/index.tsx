import { CollectReferences, defineTool, hookRunTool, MakeProgram, ShowView, ToolProgram, ToolRun, ToolView } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { UseUpdateProxy } from "@engraft/update-proxy-react";
import { ValueEditable } from "@engraft/core-widgets";

type Program = {
  toolName: 'test-show-program',
  subProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context, defaultInputCode) => ({
  toolName: 'test-show-program',
  subProgram: context.makeSlotWithCode(defaultInputCode || ''),
});

const collectReferences: CollectReferences<Program> = (program) => program.subProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings, context } = props;

  const subResult = hookRunTool({program: program.subProgram, varBindings, context})

  const outputP = subResult.outputP;

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xPad10 xGap10">
          <ShowView view={subResult.view} updateProgram={programUP.subProgram.$apply} />
          <ValueEditable value={program.subProgram} updater={programUP.subProgram.$apply}/>
        </div>
      } />
  }), [program.subProgram, subResult.view]);

  return { outputP, view };
}));

export default defineTool({ name: 'test-show-program', makeProgram, collectReferences, run });
