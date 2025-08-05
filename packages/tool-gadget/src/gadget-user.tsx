import { CollectReferences, defineTool, EngraftPromise, hookMemo, hookRefunction, hookRunTool, hooks, hookThen, MakeProgram, memoizeProps, renderWithReact, runTool, ShowView, ToolOutputView, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, up, usePromiseState, useRefunction } from "@engraft/toolkit";
import { memo, useEffect } from "react";
import { GadgetClosure, runOutputProgram, runViewProgram } from "./core.js";

type Program = {
  toolName: 'gadget-user',

  // this is the program that returns a gadget definition as output...
  closureProgram: ToolProgram,

  // this is the "program" that is the gadget's serialized state
  gadgetProgram: unknown,
}

const makeProgram: MakeProgram<Program> = (context) => ({
  toolName: 'gadget-user',

  closureProgram: context.makeSlotWithCode(''),
  gadgetProgram: null,
});

const collectReferences: CollectReferences<Program> = (program) => program.closureProgram;

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const closureResults = hookRunTool({program: program.closureProgram, varBindings, context});

  const gadgetProgramP = hookMemo(() =>
    hookThen(closureResults.outputP, (closureOutput) => {
      const closure = closureOutput.value as GadgetClosure;
      const { def, closureVarBindings } = closure;
      const { initialProgramProgram } = def;

      // too lazy to conditionally run initialProgramProgram
      const initialProgramResults = hookRunTool({program: initialProgramProgram, varBindings: closureVarBindings, context});
      const gadgetProgramP = program.gadgetProgram !== null ?
        EngraftPromise.resolve(program.gadgetProgram) :
        initialProgramResults.outputP.then((initialProgramOutput) => initialProgramOutput.value);

      return gadgetProgramP;
    }),
    [closureResults.outputP, context, program.gadgetProgram]
  );

  const outputP = hookMemo(() =>
    hookThen(EngraftPromise.all(closureResults.outputP, gadgetProgramP), ([closureOutput, gadgetProgram]) => {
      const closure = closureOutput.value as GadgetClosure;
      const { def, closureVarBindings } = closure;

      const outputResultEtc = hookRefunction(
        runOutputProgram,
        def, closureVarBindings, gadgetProgram, context
      );
      return outputResultEtc.result.outputP;
    }),
    [closureResults.outputP, context, gadgetProgramP]
  );

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((renderProps) => <View {...props} {...renderProps} gadgetProgramP={gadgetProgramP} />),
  }), [gadgetProgramP, props]);

  return {outputP, view};
}));

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  gadgetProgramP: EngraftPromise<unknown>,
}) => {
  const { program, updateProgram, varBindings, context, gadgetProgramP, autoFocus } = props;
  const programUP = up(updateProgram);

  const closureResults = useRefunction(runTool, {program: program.closureProgram, varBindings, context});
  const closureOutputState = usePromiseState(closureResults.outputP);

  const gadgetProgramState = usePromiseState(gadgetProgramP);

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>gadget</b>
        <ShowView view={closureResults.view} updateProgram={programUP.closureProgram.$} autoFocus={autoFocus} />
      </div>
      {closureOutputState.status === 'fulfilled' && gadgetProgramState.status === 'fulfilled' &&
        <ViewWithClosure
          {...props}
          closure={closureOutputState.value.value as GadgetClosure}
          gadgetProgram={gadgetProgramState.value}
        />
      }
    </div>
  );
});

const ViewWithClosure = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  closure: GadgetClosure,
  gadgetProgram: unknown,
}) => {
  const { program, updateProgram, context, closure, gadgetProgram } = props;
  const programUP = up(updateProgram);

  const gadgetProgramUP = programUP.gadgetProgram;

  useEffect(() => {
    if (program.gadgetProgram === null) {
      gadgetProgramUP.$set(gadgetProgram);
    }
  }, [gadgetProgram, gadgetProgramUP, program.gadgetProgram]);

  const viewResultEtc = useRefunction(runViewProgram,
    closure.def, closure.closureVarBindings, gadgetProgram, gadgetProgramUP, context,
  );

  return <ToolOutputView outputP={viewResultEtc.result.outputP} displayReactElementsDirectly={true} />;
});

export const GadgetUser = defineTool({ name: "gadget-user", makeProgram, collectReferences, run });
