import { ComputeReferences, EngraftPromise, hookRunTool, newVar, ProgramFactory, references, runTool, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, Var, VarBindings } from "@engraft/core";
import { hookFork, hookMemo, hookRefunction, hooks, memoizeProps } from "@engraft/refunc";
import { useRefunction } from "@engraft/refunc-react";
import { isObject } from "@engraft/shared/lib/isObject.js";
import { difference, union } from "@engraft/shared/lib/sets.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { outputBackgroundStyle } from "@engraft/toolkit";
import { UpdateProxy, useStateUP, useUpdateProxy } from "@engraft/update-proxy-react";
import { memo, useCallback, useEffect, useMemo } from "react";
import { useStateSetOnly } from "../../util/immutable-react.js";
import { ToolOutputView } from "../../view/Value.js";
import { SimSlider, SimSliderValue } from "./SimSlider.js";


export type Program = {
  toolName: 'simulation',
  ticksCount: number,
  stateVar: Var,
  initProgram: ToolProgram,
  onTickProgram: ToolProgram,
  toDrawProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const stateVar = newVar('state');
  return {
    toolName: 'simulation',
    ticksCount: 20,
    stateVar,
    initProgram: slotWithCode('{}'),
    onTickProgram: slotWithCode(stateVar.id),
    toDrawProgram: slotWithCode(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
  };
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(
    union(references(program.initProgram), references(program.onTickProgram), references(program.toDrawProgram)),
    [program.stateVar.id]
  );

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const initResult = hookRunTool({ program: program.initProgram, varBindings });

  const onTickResults = hookRefunction(runSimulation, {
    program, varBindings, initOutputP: initResult.outputP, ticksCount: program.ticksCount
  });

  const allTickOutputsP = hookMemo(() => EngraftPromise.all([
    initResult.outputP,
    ...onTickResults.map(onTickResult => onTickResult.outputP)
  ]), [initResult.outputP, onTickResults]);

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
    render: (renderProps) => <View
      {...props}
      {...renderProps}
      initResult={initResult}
      onTickResults={onTickResults}
    />
  }), [props, initResult, onTickResults]);

  return { outputP, view };
}));

type RunSimulationProps = {
  program: Program,
  varBindings: VarBindings,
  initOutputP: EngraftPromise<ToolOutput>,
  ticksCount: number,
}

const runSimulation = memoizeProps(hooks((props: RunSimulationProps) => {
  const { program, varBindings, initOutputP, ticksCount } = props;

  return hookFork((branch) => {
    // Even if the tick function is async, we can synchronously construct the computation graph.
    // Hence, no need for hookForkLater here.

    const onTickResults: ToolResult[] = [];
    let lastOutputP = initOutputP;
    for (let i = 0; i < ticksCount; i++) {
      const varBindingsWithState = {
        ...varBindings,
        [program.stateVar.id]: { var_: program.stateVar, outputP: lastOutputP }
      };
      const onTickResult = branch(`${i}`, () => {
        return hookRunTool({ program: program.onTickProgram, varBindings: varBindingsWithState });
      });
      onTickResults.push(onTickResult);
      lastOutputP = onTickResult.outputP;
    }
    return onTickResults;
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
  draft: Draft | undefined,
}) => {
  const { program, varBindings, draft } = props;

  return hookFork((branch) => {
    if (draft) {
      return branch('draft', () => {
        return hookRefunction(runSimulation, {
          program,
          varBindings,
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
  onTickResults: ToolResult[],
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, initResult, onTickResults } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [draft, draftUP] = useStateUP<Draft | undefined>(() => undefined);

  let [selection, setSelection] = useStateSetOnly<SimSliderValue>(() => ({type: 'init', tick: 0}));
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
    program, varBindings, draft
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
        onTickResults: onTickResultsDraft!,
      };
    } else {
      return {
        initTick: 0,
        initView: initResult.view,
        initOutputP: initResult.outputP,
        onTickResults,
      };
    }
  }, [draft, initResult, onTickResults, onTickResultsDraft]);

  // TODO: Interesting pattern – viewProgram is only being used in the view, not in the output, so
  // the program is run BY the view. Hmm!
  const tickOutputP = useMemo(() => {
    if (selection.type === 'init') {
      return activeTimeline.initOutputP;
    } else {
      return activeTimeline.onTickResults[selection.tick - activeTimeline.initTick].outputP;
    }
  }, [activeTimeline, selection]);
  const toDrawVarBindings = useMemo(() => ({
    ...varBindings,
    [program.stateVar.id]: { var_: program.stateVar, outputP: tickOutputP },
  }), [varBindings, program.stateVar, tickOutputP]);
  const toDrawResult = useRefunction(runTool, { program: program.toDrawProgram, updateProgram: programUP.toDrawProgram.$apply, varBindings: toDrawVarBindings });

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
              onTickResult={activeTimeline.onTickResults[selection.tick - activeTimeline.initTick]}
              onTickProgramUP={programUP.onTickProgram}
              incomingOutputP={selection.tick - activeTimeline.initTick === 0 ? activeTimeline.initOutputP : activeTimeline.onTickResults[selection.tick - activeTimeline.initTick - 1].outputP}
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
  onTickResult: ToolResult,
  onTickProgramUP: UpdateProxy<ToolProgram>,
  incomingOutputP: EngraftPromise<ToolOutput>,
  draft: Draft | undefined,
  draftUP: UpdateProxy<Draft | undefined>,
  tick: number,
}) => {
  const { onTickResult, onTickProgramUP, incomingOutputP, draft, draftUP, tick } = props;

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
      <ShowView
        view={onTickResult.view}
        updateProgram={updateProgram}
      />
      {!onTickResult.view.showsOwnOutput &&
        <div className='xPad10 xRelative' style={{...outputBackgroundStyle}}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 5, opacity: 0.5 }}>
            outgoing state
          </div>
          <ToolOutputView outputP={onTickResult.outputP} />
        </div>
      }
    </div>
  </div>;
})
