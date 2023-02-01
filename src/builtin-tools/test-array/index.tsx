import { ComputeReferences, ProgramFactory, references, ToolProgram, ToolProps, ToolView } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hookFork, hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { union } from "src/util/sets";
import { UseUpdateProxy } from "src/util/UpdateProxy.react";

export type Program = {
  toolName: 'test-array',
  subToolPrograms: ToolProgram[],
}

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: 'test-array',
    subToolPrograms: [],
  }
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(...program.subToolPrograms.map(subToolProgram => references(subToolProgram)));

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const subToolResults = hookMemo(() =>
    hookFork((branch) =>
      program.subToolPrograms.map((subToolProgram, i) => branch(`${i}`, () => {
        // TODO: does this memo (& others like it) still make sense?
        return hookMemo(() => {
          return hookRunTool({
            program: subToolProgram,
            varBindings,
          });
        }, [subToolProgram, varBindings])
      }))
    )
  , [program.subToolPrograms, varBindings]);

  const subToolOutputPs = subToolResults.map(result => result.outputP);
  const subToolViews = subToolResults.map(result => result.view);

  const outputP = hookMemo(() =>
    EngraftPromise.all(subToolOutputPs).then(outputs => ({
      value: outputs.map(output => output.value),
    }))
  , subToolOutputPs);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="ArrayTool">
          {subToolViews.map((view, i) =>
            <ShowView key={i} view={view} updateProgram={programUP.subToolPrograms[i].$apply} />
          )}
        </div>
      } />
  }), subToolViews);

  return { outputP, view };
}));
