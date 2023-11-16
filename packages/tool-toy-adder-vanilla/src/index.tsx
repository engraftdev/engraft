import { CollectReferences, EngraftPromise, MakeProgram, ToolProgram, ToolProps, ToolView, defineTool, hookMemo, hookRefunction, hookRunTool, hooks, memoizeProps } from "@engraft/toolkit";

export type Program = {
  toolName: 'toy-adder-vanilla',
  xProgram: ToolProgram,
  yProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context) => ({
  toolName: 'toy-adder-vanilla',
  xProgram: context.makeSlotWithCode(''),
  yProgram: context.makeSlotWithCode(''),
});

const collectReferences: CollectReferences<Program> = (program) => [ program.xProgram, program.yProgram ];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const xResults = hookRunTool({program: program.xProgram, varBindings, context});
  const yResults = hookRunTool({program: program.yProgram, varBindings, context});

  const outputP = hookMemo(() =>
    EngraftPromise.all([xResults.outputP, yResults.outputP])
      .then(([xOutput, yOutput]) => {
        if (typeof xOutput.value !== 'number') { throw new Error('x must be a number'); }
        if (typeof yOutput.value !== 'number') { throw new Error('y must be a number'); }
        return {value: xOutput.value + yOutput.value};
      })
  , [xResults.outputP, yResults.outputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: hooks(({updateProgram, scopeVarBindings}, element) => {
      const [xElement, yElement] = hookMemo(() => {
        element.innerHTML = `
          <div class="xCol xGap10 xPad10">
            <div class="xRow xGap10">
              <b>x</b>
              <div class="slot-for-x"></div>
            </div>

            <div class="xRow xGap10">
              <b>y</b>
              <div class="slot-for-y"></div>
            </div>
          </div>
        `;
        return [
          element.querySelector('.slot-for-x'),
          element.querySelector('.slot-for-y'),
        ];
      }, [element]);

      // this is easier with UpdateProxy, but I'll avoid it here to keep things vanilla
      const updateProgramX = hookMemo(() => (
        (f: (old: ToolProgram) => ToolProgram) =>
          updateProgram((program) => ({...program, xProgram: f(program.xProgram)}))
      ), [updateProgram]);
      const updateProgramY = hookMemo(() => (
        (f: (old: ToolProgram) => ToolProgram) =>
          updateProgram((program) => ({...program, yProgram: f(program.yProgram)}))
      ), [updateProgram]);

      hookRefunction(xResults.view.render, {updateProgram: updateProgramX, scopeVarBindings}, xElement);
      hookRefunction(yResults.view.render, {updateProgram: updateProgramY, scopeVarBindings}, yElement);
    }),
  }), [xResults.view, yResults.view]);

  return {outputP, view};
}));

export default defineTool({ name: 'toy-adder-vanilla', makeProgram, collectReferences, run })
