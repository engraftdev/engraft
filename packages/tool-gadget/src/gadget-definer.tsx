import { ToolOutputView, Value } from "@engraft/original/lib/view/Value";
import { VarDefinition } from "@engraft/original/lib/view/Vars";
import { ComputeReferences, defineTool, EngraftPromise, hookMemo, hooks, memoizeProps, newVar, ProgramFactory, references, runTool, SetOps, ShowView, slotWithCode, ToolProps, ToolView, ToolViewRenderProps, UpdateProxy, useIncr, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import { memo, useEffect, useState } from "react";
import { GadgetClosure, GadgetDef, runOutputProgram, runViewProgram } from "./core";

export type Program = {
  toolName: 'gadget-definer',
  def: GadgetDef,
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'gadget-definer',
  def: {
    initialProgramProgram: slotWithCode(''),
    outputProgram: slotWithCode(''),
    viewProgram: slotWithCode(''),
    programVar: newVar('program'),
    programUPVar: newVar('program updater'),
  },
});

const computeReferences: ComputeReferences<Program> = (program) =>
  SetOps.difference(
    SetOps.union(
      references(program.def.initialProgramProgram),
      references(program.def.outputProgram),
      references(program.def.viewProgram),
    ),
    [
      program.def.programVar.id,
      program.def.programUPVar.id,
    ]
  );

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    const gadgetClosure: GadgetClosure = {
      gadgetClosure: true,
      def: program.def,
      closureVarBindings: varBindings,
    };
    return {value: gadgetClosure};
  }), [program.def, varBindings]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...props} {...renderProps} />
  }), [props]);

  return {outputP, view};
}));

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program>) => {
  const { program, updateProgram, varBindings, autoFocus } = props;
  const programUP = useUpdateProxy(updateProgram);

  const initialProgramResults = useIncr(runTool, {program: program.def.initialProgramProgram, varBindings});
  const initialProgramOutputState = usePromiseState(initialProgramResults.outputP);

  const [gadgetProgram, setGadgetProgram] = useState<unknown | null>(() => {
    if (initialProgramOutputState.status === 'fulfilled') {
      return initialProgramOutputState.value.value;
    } else {
      return null;
    }
  })
  useEffect(() => {
    if (initialProgramOutputState.status === 'fulfilled' && gadgetProgram === null) {
      setGadgetProgram(initialProgramOutputState.value.value);
    }
  }, [gadgetProgram, initialProgramOutputState.status, initialProgramOutputState]);
  const gadgetProgramUP = useUpdateProxy(setGadgetProgram) as UpdateProxy<unknown>;

  const outputResults = useIncr(
    runOutputProgram,
    program.def, varBindings, gadgetProgram
  );

  const viewResults = useIncr(
    runViewProgram,
    program.def, varBindings, gadgetProgram, gadgetProgramUP
  );

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10 xAlignTop">
        <VarDefinition var_={program.def.programVar} />
        <div>
          <Value value={gadgetProgram} />
        </div>
        {initialProgramOutputState.status === 'fulfilled' &&
          <button onClick={() => gadgetProgramUP.$set(initialProgramOutputState.value.value)}>
            reset
          </button>
        }
      </div>
      <div className="xRow xGap10">
        <b>initial program</b>
        <ShowView view={initialProgramResults.view} updateProgram={programUP.def.initialProgramProgram.$} autoFocus={autoFocus} />
      </div>
      <div className="xRow xGap10">
        <b>output</b>
        <div>
          <ShowView view={outputResults.view} updateProgram={programUP.def.outputProgram.$} />
          {!outputResults.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, backgroundColor: '#f0f0f0'}}>
              <ToolOutputView outputP={outputResults.outputP} />
            </div>
          </>}
        </div>
      </div>
      <div className="xRow xGap10">
        <b>view</b>
        <div>
          <ShowView view={viewResults.view} updateProgram={programUP.def.viewProgram.$} />
          {!viewResults.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, backgroundColor: '#f0f0f0'}}>
              <ToolOutputView outputP={viewResults.outputP} displayReactElementsDirectly={true} />
            </div>
          </>}
        </div>

      </div>
    </div>
  );
});

export const GadgetDefiner = defineTool({ programFactory, computeReferences, run });
