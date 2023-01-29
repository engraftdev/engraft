import { ComputeReferences, ProgramFactory, references, ToolProgram, ToolProps } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hookFork, hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { hookAt, hookUpdateAtIndex } from "src/util/immutable-incr";
import { union } from "src/util/sets";

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
  // console.log("running array with props", props)

  const { program, updateProgram, varBindings } = props;

  const [subToolPrograms, updateSubToolPrograms] = hookAt(program, updateProgram, 'subToolPrograms');

  const subToolResults = hookMemo(() =>
    hookFork((branch) =>
      subToolPrograms.map((subToolProgram, i) => branch(`${i}`, () => {
        return hookMemo(() => {
          const updateSubToolProgram = hookUpdateAtIndex(updateSubToolPrograms, i);

          return hookRunTool({
            program: subToolProgram,
            updateProgram: updateSubToolProgram,
            varBindings,
          });
        }, [subToolProgram, updateSubToolPrograms, varBindings])
      }))
    )
  , [subToolPrograms, updateSubToolPrograms, varBindings]);

  const subToolOutputPs = subToolResults.map(result => result.outputP);
  const subToolViews = subToolResults.map(result => result.view);

  const outputP = hookMemo(() =>
    EngraftPromise.all(subToolOutputPs).then(outputs => ({
      value: outputs.map(output => output.value),
    }))
  , subToolOutputPs);

  const view = hookMemo(() => ({
    render: () =>
      <div className="ArrayTool">
        {subToolViews.map((view, i) => <ShowView key={i} view={view} />)}
      </div>
  }), subToolViews);

  return { outputP, view };
}));
