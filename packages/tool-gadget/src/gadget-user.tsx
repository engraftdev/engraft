import { ToolOutputView } from "@engraft/original/lib/view/Value.js";
import { ComputeReferences, defineTool, EngraftPromise, hookIncr, hookLater, hookMemo, hookRunTool, hooks, memoizeProps, ProgramFactory, references, runTool, SetOps, ShowView, slotWithCode, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, useIncr, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import { memo, useEffect } from "react";
import { GadgetClosure, runOutputProgram, runViewProgram } from "./core.js";

type Program = {
  toolName: 'gadget-user',

  // this is the program that returns a gadget definition as output...
  closureProgram: ToolProgram,

  // this is the "program" that is the gadget's serialized state
  gadgetProgram: unknown,
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'gadget-user',

  closureProgram: slotWithCode(''),
  gadgetProgram: null,
});

const computeReferences: ComputeReferences<Program> = (program) =>
  SetOps.union(references(program.closureProgram));

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const closureResults = hookRunTool({program: program.closureProgram, varBindings});

  const gadgetProgramP =
    hookMemo(() => {
      const later = hookLater();
      return closureResults.outputP.then((closureOutput) => later(() => {
        const closure = closureOutput.value as GadgetClosure;
        const { def, closureVarBindings } = closure;
        const { initialProgramProgram } = def;

        // too lazy to conditionally run initialProgramProgram
        const initialProgramResults = hookRunTool({program: initialProgramProgram, varBindings: closureVarBindings});
        const gadgetProgramP = program.gadgetProgram !== null ?
          EngraftPromise.resolve(program.gadgetProgram) :
          initialProgramResults.outputP.then((initialProgramOutput) => initialProgramOutput.value);

        return gadgetProgramP;
      }));
    }, [closureResults.outputP, program.gadgetProgram]);

  const outputP =
    hookMemo(() => {
      const later = hookLater();
      return EngraftPromise.all(closureResults.outputP, gadgetProgramP).then(([closureOutput, gadgetProgram]) => later(() => {
        const closure = closureOutput.value as GadgetClosure;
        const { def, closureVarBindings } = closure;

        const outputResults = hookIncr(
          runOutputProgram,
          def, closureVarBindings, gadgetProgram
        );
        return outputResults.outputP;
      }));
    }, [closureResults.outputP, gadgetProgramP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...props} {...renderProps} gadgetProgramP={gadgetProgramP} />
  }), [gadgetProgramP, props]);

  return {outputP, view};
}));

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  gadgetProgramP: EngraftPromise<unknown>,
}) => {
  const { program, updateProgram, varBindings, gadgetProgramP, autoFocus } = props;
  const programUP = useUpdateProxy(updateProgram);

  const closureResults = useIncr(runTool, {program: program.closureProgram, varBindings});
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
  const { program, updateProgram, closure, gadgetProgram } = props;
  const programUP = useUpdateProxy(updateProgram);

  const gadgetProgramUP = programUP.gadgetProgram;

  useEffect(() => {
    if (program.gadgetProgram === null) {
      gadgetProgramUP.$set(gadgetProgram);
    }
  }, [gadgetProgram, gadgetProgramUP, program.gadgetProgram]);

  const viewResults = useIncr(runViewProgram,
    closure.def, closure.closureVarBindings, gadgetProgram, gadgetProgramUP
  );

  return <ToolOutputView outputP={viewResults.outputP} displayReactElementsDirectly={true} />;
});

export const GadgetUser = defineTool({ programFactory, computeReferences, run });
