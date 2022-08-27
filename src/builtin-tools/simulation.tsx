import _ from "lodash";
import { memo, useEffect, useMemo } from "react";
import { newVar, ProgramFactory, ProvideVarBinding, ToolProgram, ToolProps, valueOrUndefined, Var } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import { useAt, useStateSetOnly } from "src/util/state";
import { ToolOutputView } from "src/view/Value";
import { slotSetTo } from "./slot";

export interface Program {
  toolName: 'simulation';
  iterationsCount: number;
  initProgram: ToolProgram;
  stateVar: Var;
  upProgram: ToolProgram;
  viewProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const stateVar = newVar('state');
  return {
    toolName: 'simulation',
    iterationsCount: 20,
    initProgram: slotSetTo('{}'),
    stateVar,
    upProgram: slotSetTo(stateVar.id),
    viewProgram: slotSetTo(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [initComponent, initView, initOutput] = useSubTool({program, updateProgram, subKey: 'initProgram'})

  const { iterationsCount } = program;

  const iterations = useMemo(() => {
    return _.range(program.iterationsCount)
  }, [program.iterationsCount])

  const [upProgram, updateUpProgram] = useAt(program, updateProgram, 'upProgram');

  const upToolInfos = useMemo(() =>
    Object.fromEntries(iterations.map((elem, i) => {
      return [i, {program: upProgram, updateProgram: updateUpProgram}]
    }))
  , [iterations, upProgram, updateUpProgram]);
  const [upComponents, upViews, upOutputs] = useTools(upToolInfos);

  const [viewComponent, viewView, viewOutput] = useSubTool({program, updateProgram, subKey: 'viewProgram'})

  useOutput(reportOutput, useMemo(() => {
    let outputs = [{...valueOrUndefined(initOutput) as object, i: 0}];
    for (let i = 0; i < iterationsCount; i++) {
      outputs.push({...valueOrUndefined(upOutputs[i]) as object, i: i + 1});
    }
    return {value: outputs};
  }, [initOutput, iterationsCount, upOutputs]));

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  useEffect(() => {
    if (highlightedIndex > iterationsCount) {
      setHighlightedIndex(Math.max(iterationsCount, 0));
    }
  }, [highlightedIndex, iterationsCount, setHighlightedIndex])

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xRow xGap10" style={{padding: 10}}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 10,
          // background: 'linear-gradient(to bottom right, rgba(93,157,185,0.05), rgba(243,50,139,0.05))'
          }}>
          <div style={{textAlign: 'right', fontWeight: 'bold'}}>step</div>
          <div>
            <input
              type="range"
              value={highlightedIndex}
              onChange={(ev) => setHighlightedIndex(+ev.target.value)}
              min={0} max={iterationsCount - 1} step={1}/>
            {' '}
            <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{highlightedIndex}</div>
            {/* /
            <div>max</div> <input
              type="range"
              value={iterationsCount}
              onChange={(ev) => updateIterationsCount(() => +ev.target.value)}
              min={0} max={100} step={1}/>
            {' '}
            <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{iterationsCount}</div> */}
          </div>
          <div style={{textAlign: 'right', fontWeight: 'bold'}}>init</div>
          <div>
            <ShowView view={initView} autoFocus={autoFocus} />
          </div>
          <div style={{textAlign: 'right', fontWeight: 'bold'}}>update</div>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <ShowView view={upViews[highlightedIndex]} />
          </div>
          <div style={{textAlign: 'right', fontWeight: 'bold'}}>view</div>
          <ShowView view={viewView} />
        </div>
        <ToolOutputView toolOutput={viewOutput} displayReactElementsDirectly={true}/>
      </div>
  }), [highlightedIndex, initView, iterationsCount, setHighlightedIndex, upViews, viewOutput, viewView]));

  return <>
    {initComponent}
    {iterations.map((inputArrayElem, i) =>
      <ProvideVarBinding key={i} var_={program.stateVar} value={(i === 0 ? initOutput : upOutputs[i - 1]) || undefined}>
        {upComponents[i]}
      </ProvideVarBinding>
    )}
    <ProvideVarBinding var_={program.stateVar} value={(upOutputs[highlightedIndex]) || undefined}>
      {viewComponent}
    </ProvideVarBinding>
  </>
});
