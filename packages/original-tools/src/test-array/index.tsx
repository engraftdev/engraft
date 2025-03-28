import { arrEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { CollectReferences, defineTool, EngraftPromise, hookFork, hookMemo, hookRunTool, hooks, MakeProgram, memoizeProps, renderWithReact, ShowView, ToolProgram, ToolProps, ToolView, up } from "@engraft/toolkit";

export type Program = {
  toolName: 'test-array',
  subToolPrograms: ToolProgram[],
}

const makeProgram: MakeProgram<Program> = () => {
  return {
    toolName: 'test-array',
    subToolPrograms: [],
  }
};

const collectReferences: CollectReferences<Program> = (program) => program.subToolPrograms;

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const subToolResults = hookMemo(() =>
    hookFork((branch) =>
      program.subToolPrograms.map((subToolProgram, i) => branch(`${i}`, () => {
        // TODO: does this memo (& others like it) still make sense?
        return hookMemo(() => {
          return hookRunTool({
            program: subToolProgram,
            varBindings,
            context,
          });
        }, [context, subToolProgram, varBindings])
      }))
    )
  , [context, program.subToolPrograms, varBindings]);

  const subToolOutputPs = subToolResults.map(result => result.outputP);
  const subToolViews = subToolResults.map(result => result.view);

  const outputP = hookMemo(() =>
    EngraftPromise.all(subToolOutputPs).then(outputs => ({
      value: outputs.map(output => output.value),
    }))
  , subToolOutputPs, arrEqWithRefEq);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram}) =>
      <div className="ArrayTool">
        {subToolViews.map((view, i) =>
          <ShowView key={i} view={view} updateProgram={up(updateProgram).subToolPrograms[i].$apply} />
        )}
      </div>
    ),
  }), subToolViews, arrEqWithRefEq);

  return { outputP, view };
}));

export default defineTool({ name: 'test-array', makeProgram, collectReferences, run })
