import { ComputeReferences, EngraftPromise, hookRunTool, newVar, ProgramFactory, references, runTool, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, Var } from "@engraft/core";
import { hookFork, hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { useRefunction } from "@engraft/refunc-react";
import { difference, union } from "@engraft/shared/lib/sets.js";
import { outputBackgroundStyle } from "@engraft/toolkit";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import _ from "lodash";
import { memo, useMemo } from "react";
import { useStateSetOnly } from "../../util/immutable-react.js";
import { ToolOutputView } from "../../view/Value.js";
import { isObject } from "@engraft/shared/lib/isObject.js";


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

  const onTickResults = hookFork((branch) => {
    // Even if the tick function is async, we can synchronously construct the computation graph.
    // Hence, no need for hookForkLater here.

    const onTickResults = [initResult];
    for (let i = 0; i < program.ticksCount; i++) {
      const varBindingsWithState = {
        ...varBindings,
        [program.stateVar.id]: { var_: program.stateVar, outputP: _.last(onTickResults)!.outputP }
      };
      const onTickResult = branch(`${i}`, () => {
        return hookRunTool({ program: program.onTickProgram, varBindings: varBindingsWithState });
      });
      onTickResults.push(onTickResult);
    }
    return onTickResults;
  });

  const outputP = EngraftPromise.all(onTickResults.map(tickResult => tickResult.outputP)).then((tickOutputs) => {
    return {value: tickOutputs.map((tickOutput, tick) => {
      const { value } = tickOutput;
      if (isObject(value)) {
        return {...value, tick};
      } else {
        return value;
      }
    })};
  });

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

type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  initResult: ToolResult,
  onTickResults: ToolResult[],
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, autoFocus, onTickResults } = props;
  const programUP = useUpdateProxy(updateProgram);

  let [selectedTick, setSelectedTick] = useStateSetOnly(() => 0);
  if (selectedTick > program.ticksCount) {
    selectedTick = Math.max(program.ticksCount, 0);
  }

  // TODO: Interesting pattern – viewProgram is only being used in the view, not in the output, so
  // the program is run BY the view. Hmm!
  const tickOutputP = useMemo(() => onTickResults[selectedTick].outputP, [onTickResults, selectedTick]);
  const toDrawVarBindings = useMemo(() => ({
    ...varBindings,
    [program.stateVar.id]: { var_: program.stateVar, outputP: tickOutputP },
  }), [varBindings, program.stateVar, tickOutputP]);
  const toDrawResult = useRefunction(runTool, { program: program.toDrawProgram, updateProgram: programUP.toDrawProgram.$apply, varBindings: toDrawVarBindings });
  const unresolvedP = useMemo(() => EngraftPromise.unresolved<ToolOutput>(), []);
  const beforeSelectedTickOutputP = selectedTick === 0 ? unresolvedP : onTickResults[selectedTick-1].outputP;
  const afterSelectedTickOutputP = onTickResults[selectedTick].outputP;

  return (
    <div className="xRow xGap10" style={{padding: 10}}>
      <ToolOutputView outputP={toDrawResult.outputP} displayReactElementsDirectly={true}/>
      <div className="step-rows xCol xGap10 xShrinkable">
        <div className="xRow xGap10">
        <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>tick</div>
          <div>
            <input
              type="range"
              value={selectedTick}
              onChange={(ev) => setSelectedTick(+ev.target.value)}
              min={0} max={program.ticksCount} step={1}/>
            {' '}
            <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{selectedTick}</div>
          </div>
        </div>
        <div className="xRow xGap10 xExpand">
          <div style={{width: 40, textAlign: 'right', fontWeight: 'bold'}}>
            { selectedTick === 0
              ? <>init</>
              : <>on<br/>tick</>
            }
          </div>
          <div className="xCol xGap10 xShrinkable xExpand">
            {selectedTick > 0 && <>
              <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
                <ToolOutputView outputP={beforeSelectedTickOutputP} />
              </div>
              <div>↓</div>
            </>}
            <ShowView
              view={onTickResults[selectedTick].view}
              updateProgram={selectedTick === 0 ? programUP.initProgram.$apply : programUP.onTickProgram.$apply}
              autoFocus={autoFocus}
            />
            {!onTickResults[selectedTick].view.showsOwnOutput && <>
              <div>↓</div>
              <div className='xInlineBlock xAlignSelfLeft xPad10' style={{borderRadius: 5, ...outputBackgroundStyle}}>
                <ToolOutputView outputP={afterSelectedTickOutputP} />
              </div>
            </>}
          </div>
        </div>
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
