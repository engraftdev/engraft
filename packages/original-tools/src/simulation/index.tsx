import { Updater } from "@engraft/shared/lib/Updater.js";
import { isObject } from "@engraft/shared/lib/isObject.js";
import { CollectReferences, EngraftContext, EngraftPromise, MakeProgram, ShowView, ShowViewWithScope, ToolOutput, ToolOutputView, ToolProgram, ToolProps, ToolResult, ToolResultWithScope, ToolView, ToolViewRenderProps, UpdateProxy, Var, VarBindings, defineTool, hookFork, hookMemo, hookRefunction, hookRunTool, hookRunToolWithNewVarBindings, hooks, memoizeProps, newVar, outputBackgroundStyle, renderWithReact, runTool, up, useRefunction } from "@engraft/toolkit";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { SimSlider, SimSliderValue } from "./SimSlider.js";


export type Program = {
  toolName: 'simulation',
  ticksCount: number,
  stateVar: Var,
  initProgram: ToolProgram,
  onTickProgram: ToolProgram,
  toDrawProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context, defaultCode?: string) => {
  const stateVar = newVar('state');
  return {
    toolName: 'simulation',
    ticksCount: 20,
    stateVar,
    initProgram: context.makeSlotWithCode('{}'),
    onTickProgram: context.makeSlotWithCode(stateVar.id),
    toDrawProgram: context.makeSlotWithCode(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
  };
};

const collectReferences: CollectReferences<Program> = (program) =>
  [ program.initProgram, program.onTickProgram, program.toDrawProgram, {'-': program.stateVar} ];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const initResult = hookRunTool({ program: program.initProgram, varBindings, context });

  const onTickResultsWithScope = hookRefunction(runSimulation, {
    program, varBindings, initOutputP: initResult.outputP, ticksCount: program.ticksCount, context
  });

  const allTickOutputsP = hookMemo(() => EngraftPromise.all([
    initResult.outputP,
    ...onTickResultsWithScope.map(onTickResultWithScope => onTickResultWithScope.result.outputP)
  ]), [initResult.outputP, onTickResultsWithScope]);

  const outputP = hookMemo(() => allTickOutputsP.then((tickOutputs) => {
    return {value: tickOutputs.map((tickOutput, tick) => {
      const { value } = tickOutput;
      if (isObject(value)) {
        return {...value, tick};
      } else {
        return value;
      }
    })};
  }), [allTickOutputsP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((renderProps) =>
      <View
        {...props}
        {...renderProps}
        initResult={initResult}
        onTickResultsWithScope={onTickResultsWithScope}
      />
    ),
  }), [props, initResult, onTickResultsWithScope]);

  return { outputP, view };
}));

export default defineTool({ name: 'simulation', makeProgram, collectReferences, run })

type RunSimulationProps = {
  program: Program,
  varBindings: VarBindings,
  context: EngraftContext,
  initOutputP: EngraftPromise<ToolOutput>,
  ticksCount: number,
}

const runSimulation = memoizeProps(hooks((props: RunSimulationProps) => {
  const { program, varBindings, context, initOutputP, ticksCount } = props;

  return hookFork((branch) => {
    // Even if the tick function is async, we can synchronously construct the computation graph.
    // Hence, no need for hookForkLater here.

    const onTickResultsWithScope: ToolResultWithScope[] = [];
    let lastOutputP = initOutputP;
    for (let i = 0; i < ticksCount; i++) {
      const currentLastOutputP = lastOutputP;  // TypeScript doesn't like the ref in the function below
      const onTickResultWithScope = branch(`${i}`, () => {
        const newVarBindings = hookMemo(() => ({
          [program.stateVar.id]: { var_: program.stateVar, outputP: currentLastOutputP },
        }), [currentLastOutputP, program.stateVar]);
        return hookRunToolWithNewVarBindings({ program: program.onTickProgram, varBindings, newVarBindings, context });
      });
      onTickResultsWithScope.push(onTickResultWithScope);
      lastOutputP = onTickResultWithScope.result.outputP;
    }
    return onTickResultsWithScope;
  });
}))

// "Draft" means a version of the timeline that's branched from the version in the program.
type Draft = {
  initTick: number,
  initOutputP: EngraftPromise<ToolOutput>,
}

const runSimulationOnDraft = memoizeProps(hooks((props: {
  program: Program,
  varBindings: VarBindings,
  context: EngraftContext,
  draft: Draft | undefined,
}) => {
  const { program, varBindings, context, draft } = props;

  return hookFork((branch) => {
    if (draft) {
      return branch('draft', () => {
        return hookRefunction(runSimulation, {
          program,
          varBindings,
          context,
          initOutputP: draft!.initOutputP,
          ticksCount: program.ticksCount - draft!.initTick,
        });
      })
    } else {
      return undefined;
    }
  });
}));



type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  initResult: ToolResult,
  onTickResultsWithScope: ToolResultWithScope[],
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, context, initResult, onTickResultsWithScope } = props;
  const programUP = up(updateProgram);

  const [draft, setDraft] = useState<Draft | undefined>(() => undefined);
  const draftUP = up(setDraft);

  let [selection, setSelection] = useState<SimSliderValue>(() => ({type: 'init', tick: 0}));
  // deal with out-of-bounds selection
  if (selection.type === 'init' && selection.tick > program.ticksCount) {
    selection = {type: 'init', tick: 0};
  } else if (selection.type === 'from' && selection.tick > program.ticksCount - 1) {
    selection = {type: 'from', tick: program.ticksCount - 1};
  }
  // deal with drag-to-undraft
  useEffect(() => {
    if (draft && selection.tick < draft.initTick) {
      draftUP.$set(undefined);
    }
  });

  const onTickResultsDraft = useRefunction(runSimulationOnDraft, {
    program, varBindings, context, draft
  });

  // type Timeline = {
  //   initTick: number,
  //   initResult: ToolResult,
  //   onTickResults: ToolResult[],
  // }

  const activeTimeline = useMemo(() => {
    if (draft) {
      return {
        initTick: draft.initTick,
        initView: undefined,
        initOutputP: draft.initOutputP,
        onTickResultsWithScope: onTickResultsDraft!,
      };
    } else {
      return {
        initTick: 0,
        initView: initResult.view,
        initOutputP: initResult.outputP,
        onTickResultsWithScope,
      };
    }
  }, [draft, initResult.outputP, initResult.view, onTickResultsDraft, onTickResultsWithScope]);

  // TODO: Interesting pattern – viewProgram is only being used in the view, not in the output, so
  // the program is run BY the view. Hmm!
  const tickOutputP = useMemo(() => {
    if (selection.type === 'init') {
      return activeTimeline.initOutputP;
    } else {
      return activeTimeline.onTickResultsWithScope[selection.tick - activeTimeline.initTick].result.outputP;
    }
  }, [activeTimeline, selection]);
  const toDrawVarBindings = useMemo(() => ({
    ...varBindings,
    [program.stateVar.id]: { var_: program.stateVar, outputP: tickOutputP },
  }), [varBindings, program.stateVar, tickOutputP]);
  const toDrawResult = useRefunction(runTool, { program: program.toDrawProgram, updateProgram: programUP.toDrawProgram.$apply, varBindings: toDrawVarBindings, context });

  return (
    <div className="xRow xGap10" style={{padding: 10}}>
      <ToolOutputView outputP={toDrawResult.outputP} displayReactElementsDirectly={true}/>
      <div className="step-rows xCol xGap10 xShrinkable">
        <div className="xRow xGap10">
        <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>tick</div>
          <div>
            <SimSlider
              value={selection}
              setValue={setSelection}
              numSteps={program.ticksCount}
              draftTick={draft?.initTick}
            />
          </div>
        </div>
        { selection.type === 'init'
          ? <InitEditor
              initView={activeTimeline.initView}
              initOutputP={activeTimeline.initOutputP}
              initProgramUP={programUP.initProgram}
            />
          : <OnTickEditor
              onTickResultWithScope={activeTimeline.onTickResultsWithScope[selection.tick - activeTimeline.initTick]}
              onTickProgramUP={programUP.onTickProgram}
              incomingOutputP={
                selection.tick - activeTimeline.initTick === 0
                ? activeTimeline.initOutputP
                : activeTimeline.onTickResultsWithScope[selection.tick - activeTimeline.initTick - 1].result.outputP}
              draft={draft}
              draftUP={draftUP}
              tick={selection.tick}
            />
        }
        <div className="xRow xGap10">
          <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>
            to<br/>draw
          </div>
          <ShowView view={toDrawResult.view} updateProgram={programUP.toDrawProgram.$apply} />
        </div>
      </div>
    </div>
  );
})

export const InitEditor = memo((props: {
  initView: ToolView<ToolProgram> | undefined,
  initOutputP: EngraftPromise<ToolOutput>,
  initProgramUP: UpdateProxy<ToolProgram>,
}) => {
  const { initView, initOutputP, initProgramUP } = props;

  return <div className="xRow xGap10 xExpand">
    <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>
      init
    </div>
    <div className="xCol xShrinkable xExpand">
      {initView &&
        <ShowView
          view={initView}
          updateProgram={initProgramUP.$apply}
        />
      }
      {!(initView && initView.showsOwnOutput) &&
        <div className='xPad10 xRelative' style={{...outputBackgroundStyle}}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 5, opacity: 0.5 }}>
            outgoing state
          </div>
          <ToolOutputView outputP={initOutputP} />
        </div>
      }
    </div>
  </div>;
})

export const OnTickEditor = memo((props: {
  onTickResultWithScope: ToolResultWithScope,
  onTickProgramUP: UpdateProxy<ToolProgram>,
  incomingOutputP: EngraftPromise<ToolOutput>,
  draft: Draft | undefined,
  draftUP: UpdateProxy<Draft | undefined>,
  tick: number,
}) => {
  const { onTickResultWithScope, onTickProgramUP, incomingOutputP, draft, draftUP, tick } = props;

  const updateProgram: Updater<ToolProgram> = useCallback((f) => {
    if (tick !== 0 && tick !== draft?.initTick) {
      draftUP.$set({
        initTick: tick,
        initOutputP: incomingOutputP,
      })
    }
    onTickProgramUP.$apply(f);
  }, [draft, draftUP, incomingOutputP, onTickProgramUP, tick])

  return <div className="xRow xGap10 xExpand">
    <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>
      on<br/>tick
    </div>
    <div className="xCol xShrinkable xExpand">
      <div className='xPad10 xRelative' style={{...outputBackgroundStyle}}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: 5, opacity: 0.5 }}>
          incoming state
        </div>
        <ToolOutputView outputP={incomingOutputP} />
      </div>
      <ShowViewWithScope
        resultWithScope={onTickResultWithScope}
        updateProgram={updateProgram}
      />
      {!onTickResultWithScope.result.view.showsOwnOutput &&
        <div className='xPad10 xRelative' style={{...outputBackgroundStyle}}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 5, opacity: 0.5 }}>
            outgoing state
          </div>
          <ToolOutputView outputP={onTickResultWithScope.result.outputP} />
        </div>
      }
    </div>
  </div>;
})
