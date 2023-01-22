import _ from "lodash";
import { memo, useMemo } from "react";
import { ComputeReferences, newVar, ProgramFactory, references, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, Var } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { usePromiseState } from "src/engraft/EngraftPromise.react";
import { hookRunSubTool, runTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/mento/hookMemo";
import { hookFork, hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { useMento } from "src/mento/react";
import { useAt, useStateSetOnly } from "src/util/immutable-react";
import { difference, union } from "src/util/sets";
import { ToolOutputView } from "src/view/Value";
import { slotSetTo } from "../slot";


export interface Program {
  toolName: 'simulation';
  ticksCount: number;
  stateVar: Var;
  initProgram: ToolProgram;
  onTickProgram: ToolProgram;
  toDrawProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const stateVar = newVar('state');
  return {
    toolName: 'simulation',
    ticksCount: 20,
    stateVar,
    initProgram: slotSetTo('{}'),
    onTickProgram: slotSetTo(stateVar.id),
    toDrawProgram: slotSetTo(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
  };
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(
    union(references(program.initProgram), references(program.onTickProgram), references(program.toDrawProgram)),
    [program.stateVar.id]
  );

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  console.log("running simulation tool")

  const { program, updateProgram, varBindings } = props;

  const initResult = hookRunSubTool({ program, updateProgram, varBindings, subKey: 'initProgram' });

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
        return hookRunSubTool({ program, updateProgram, varBindings: varBindingsWithState, subKey: 'onTickProgram' });
      });
      onTickResults.push(onTickResult);
    }
    return onTickResults;
  });

  const outputP = EngraftPromise.all(onTickResults.map(tickResult => tickResult.outputP)).then((tickOutputs) => {
    return {value: tickOutputs.map(tickOutput => tickOutput.value)};
  });

  const view: ToolView = hookMemo(() => ({
    render: (renderProps) => <View
      {...props}
      {...renderProps}
      initResult={initResult}
      onTickResults={onTickResults}
    />
  }), [props, onTickResults]);

  return { outputP, view };
}));

type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  initResult: ToolResult,
  onTickResults: ToolResult[],
}

const View = memo((props: ViewProps) => {
  console.log("rendering simulation view")

  const { program, updateProgram, varBindings, autoFocus, onTickResults } = props;

  let [selectedTick, setSelectedTick] = useStateSetOnly(() => 0);
  if (selectedTick > program.ticksCount) {
    selectedTick = Math.max(program.ticksCount, 0);
  }

  // TODO: Interesting pattern – viewProgram is only being used in the view, not in the output, so
  // the program is run BY the view. Hmm!
  const [toDrawProgram, updateToDrawProgram] = useAt(program, updateProgram, 'toDrawProgram');
  const tickOutputP = useMemo(() => onTickResults[selectedTick].outputP, [onTickResults, selectedTick]);
  const toDrawVarBindings = useMemo(() => ({
    ...varBindings,
    [program.stateVar.id]: { var_: program.stateVar, outputP: tickOutputP },
  }), [varBindings, program.stateVar, tickOutputP]);
  const toDrawResult = useMento(runTool, { program: toDrawProgram, updateProgram: updateToDrawProgram, varBindings: toDrawVarBindings });
  const toDrawOutputState = usePromiseState(toDrawResult.outputP);
  const beforeSelectedTickOutputState = usePromiseState(selectedTick === 0 ? EngraftPromise.unresolved<ToolOutput>() : onTickResults[selectedTick-1].outputP);
  const afterSelectedTickOutputState = usePromiseState(onTickResults[selectedTick].outputP);

  return (
    <div className="xRow xGap10" style={{padding: 10}}>
      <ToolOutputView outputState={toDrawOutputState} displayReactElementsDirectly={true}/>
      <div className="step-rows xCol xGap10">
        <div className="xRow xGap10">
        <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>tick</div>
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
        <div className="xRow xGap10">
          <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>{selectedTick === 0 ? 'init' : 'on-tick'}</div>
          <div className="xCol xGap10">
            {selectedTick > 0 &&
              <div className="xRow xGap10">
                <div>before</div>
                <ToolOutputView outputState={beforeSelectedTickOutputState} />
              </div>
            }
            <ShowView view={onTickResults[selectedTick].view} autoFocus={autoFocus} />
            {!onTickResults[selectedTick].view.showsOwnOutput &&
              <div className="xRow xGap10">
                <div>after</div>
                <ToolOutputView outputState={afterSelectedTickOutputState} />
              </div>
            }
          </div>
        </div>
        <div className="xRow xGap10">
          <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>to-draw</div>
          <ShowView view={toDrawResult.view} />
        </div>
      </div>
    </div>
  );

})
