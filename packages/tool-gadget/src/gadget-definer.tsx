import { ToolOutputView, Value } from "@engraft/original/lib/view/Value.js";
import { VarDefinition } from "@engraft/original/lib/view/Vars.js";
import { ComputeReferences, EngraftPromise, ProgramFactory, SetOps, ShowView, ShowViewWithNewScopeVarBindings, ToolProps, ToolView, ToolViewRenderProps, UpdateProxy, defineTool, hookMemo, hooks, memoizeProps, newVar, outputBackgroundStyle, references, runTool, slotWithCode, useCommonWidth, usePromiseState, useRefunction, useUpdateProxy } from "@engraft/toolkit";
import { memo, useEffect, useState } from "react";
import { GadgetClosure, GadgetDef, runOutputProgram, runViewProgram } from "./core.js";

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

  const initialProgramResult = useRefunction(runTool, {program: program.def.initialProgramProgram, varBindings});
  const initialProgramOutputState = usePromiseState(initialProgramResult.outputP);

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

  const outputResult = useRefunction(
    runOutputProgram,
    program.def, varBindings, gadgetProgram
  );

  const viewResult = useRefunction(
    runViewProgram,
    program.def, varBindings, gadgetProgram, gadgetProgramUP
  );

  const leftCommonWidth = useCommonWidth();

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10 xAlignTop">
        {leftCommonWidth.wrap(
          <VarDefinition var_={program.def.programVar} />,
          'right'
        )}
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
        {leftCommonWidth.wrap(
          <div style={{textAlign: 'right', fontWeight: 'bold'}}>initial<br/>program</div>,
          'right'
        )}
        <ShowView view={initialProgramResult.view} updateProgram={programUP.def.initialProgramProgram.$} autoFocus={autoFocus} />
      </div>
      <div className="xRow xGap10">
        {leftCommonWidth.wrap(<b>output</b>, 'right')}
        <div>
          <ShowViewWithNewScopeVarBindings
            {...outputResult.viewWithNewScopeVarBinding}
            updateProgram={programUP.def.outputProgram.$}
          />
          {!outputResult.viewWithNewScopeVarBinding.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
              <ToolOutputView outputP={outputResult.outputP} />
            </div>
          </>}
        </div>
      </div>
      <div className="xRow xGap10">
      {leftCommonWidth.wrap(
        <div style={{textAlign: 'right', fontWeight: 'bold'}}>view</div>,
        'right'
      )}
        <div>
          <ShowViewWithNewScopeVarBindings
            {...viewResult.viewWithNewScopeVarBinding}
            updateProgram={programUP.def.viewProgram.$}
          />
          {!viewResult.viewWithNewScopeVarBinding.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
              <ToolOutputView outputP={viewResult.outputP} displayReactElementsDirectly={true} />
            </div>
          </>}
        </div>

      </div>
    </div>
  );
});

export const GadgetDefiner = defineTool({ programFactory, computeReferences, run });
