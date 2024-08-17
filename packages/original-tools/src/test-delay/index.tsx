import { CollectReferences, defineTool, EngraftPromise, hookMemo, hookRunTool, hooks, MakeProgram, memoizeProps, renderWithReact, ShowView, ToolProgram, ToolProps, ToolRun, ToolView, up } from "@engraft/toolkit";

type Program = {
  toolName: 'test-delay',
  delayProgram: ToolProgram,
  actualProgram: ToolProgram,
}

const collectReferences: CollectReferences<Program> = (program) => [ program.delayProgram, program.actualProgram ];

const makeProgram: MakeProgram<Program> = (context, defaultCode?: string) => ({
  toolName: 'test-delay',
  delayProgram: context.makeSlotWithCode('1000'),
  actualProgram: context.makeSlotWithCode(defaultCode || ''),
});

const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const {outputP: delayOutputP, view: delayView} = hookRunTool({program: program.delayProgram, varBindings, context});
  const {outputP: actualOutputP, view: actualView} = hookRunTool({program: program.actualProgram, varBindings, context});

  const outputP = hookMemo(() => {
    return EngraftPromise.all([actualOutputP, delayOutputP]).then(([actualOutput, delayOutput]) => {
      if (typeof delayOutput.value != 'number') {
        throw new Error("Delay must be number");
      }
      return delayByMs(actualOutput, delayOutput.value);
    });
  }, [delayOutputP, actualOutputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>delay</b>
          <ShowView view={delayView} updateProgram={up(updateProgram).delayProgram.$apply} autoFocus={autoFocus} />
          ms
        </div>
        <ShowView view={actualView} updateProgram={up(updateProgram).actualProgram.$apply} />
      </div>
    ),
  }), [delayView, actualView]);

  return {outputP, view};
}));

export default defineTool({ name: 'test-delay', makeProgram, collectReferences, run })

function delayByMs<T>(value: T, delayMs: number): EngraftPromise<T> {
  return new EngraftPromise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, delayMs)
  });
}
