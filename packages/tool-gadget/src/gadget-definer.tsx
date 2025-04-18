import { CollectReferences, EngraftPromise, MakeProgram, ShowView, ShowViewWithScope, ToolOutputView, ToolProps, ToolView, ToolViewRenderProps, UpdateProxy, Value, VarDefinition, defineTool, hookMemo, hooks, memoizeProps, newVar, outputBackgroundStyle, renderWithReact, runTool, up, useCommonWidth, usePromiseState, useRefunction } from "@engraft/toolkit";
import { memo, useEffect, useState } from "react";
import { GadgetClosure, GadgetDef, runOutputProgram, runViewProgram } from "./core.js";

export type Program = {
  toolName: 'gadget-definer',
  def: GadgetDef,
}

const makeProgram: MakeProgram<Program> = (context) => ({
  toolName: 'gadget-definer',
  def: {
    initialProgramProgram: context.makeSlotWithCode(''),
    outputProgram: context.makeSlotWithCode(''),
    viewProgram: context.makeSlotWithCode(''),
    programVar: newVar('program'),
    programUPVar: newVar('program updater'),
  },
});

const collectReferences: CollectReferences<Program> = (program) => [
  program.def.initialProgramProgram, program.def.outputProgram, program.def.viewProgram,
  { '-': [ program.def.programVar, program.def.programUPVar ] }
];

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
    render: renderWithReact((renderProps) => <View {...props} {...renderProps} />),
  }), [props]);

  return {outputP, view};
}));

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program>) => {
  const { program, updateProgram, varBindings, context, autoFocus } = props;
  const programUP = up(updateProgram);

  const initialProgramResult = useRefunction(runTool, {program: program.def.initialProgramProgram, varBindings, context});
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
  const gadgetProgramUP = up(setGadgetProgram) as UpdateProxy<unknown>;

  const outputResultWithScope = useRefunction(
    runOutputProgram,
    program.def, varBindings, gadgetProgram, context
  );

  const viewResultWithScope = useRefunction(
    runViewProgram,
    program.def, varBindings, gadgetProgram, gadgetProgramUP, context
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
          <ShowViewWithScope resultWithScope={outputResultWithScope} updateProgram={programUP.def.outputProgram.$} />
          {!outputResultWithScope.result.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
              <ToolOutputView outputP={outputResultWithScope.result.outputP} />
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
          <ShowViewWithScope resultWithScope={viewResultWithScope} updateProgram={programUP.def.viewProgram.$} />
          {!viewResultWithScope.result.view.showsOwnOutput && <>
            <div>↓</div>
            <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
              <ToolOutputView outputP={viewResultWithScope.result.outputP} displayReactElementsDirectly={true} />
            </div>
          </>}
        </div>

      </div>
    </div>
  );
});

export const GadgetDefiner = defineTool({ name: "gadget-definer", makeProgram, collectReferences, run });
