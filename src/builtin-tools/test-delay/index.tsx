import { ComputeReferences, ProgramFactory, references, ToolProgram, ToolProps, ToolRun, ToolView } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { union } from "src/util/sets";
import { UseUpdateProxy } from "src/util/UpdateProxy.react";
import { slotSetTo } from "../slot";

export type Program = {
  toolName: 'test-delay',
  delayProgram: ToolProgram,
  actualProgram: ToolProgram,
}

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.delayProgram), references(program.actualProgram));

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'test-delay',
  delayProgram: slotSetTo('1000'),
  actualProgram: slotSetTo(defaultCode || ''),
});

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const {outputP: delayOutputP, view: delayView} = hookRunTool({program: program.delayProgram, varBindings});
  const {outputP: actualOutputP, view: actualView} = hookRunTool({program: program.actualProgram, varBindings});

  const outputP = hookMemo(() => {
    return EngraftPromise.all([actualOutputP, delayOutputP]).then(([actualOutput, delayOutput]) => {
      if (typeof delayOutput.value != 'number') {
        throw new Error("Delay must be number");
      }
      return delayByMs(actualOutput, delayOutput.value);
    });
  }, [delayOutputP, actualOutputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>delay</b>
            <ShowView view={delayView} updateProgram={programUP.delayProgram.$apply} autoFocus={autoFocus} />
            ms
          </div>
          <ShowView view={actualView} updateProgram={programUP.actualProgram.$apply} />
        </div>
      } />
  }), [delayView, actualView]);

  return {outputP, view};
}));

function delayByMs<T>(value: T, delayMs: number): EngraftPromise<T> {
  return new EngraftPromise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, delayMs)
  });
}
