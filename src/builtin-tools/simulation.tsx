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

// (window as any).count = 0;

export const Component = memo((props: ToolProps<Program>) => {
  // (window as any).count++;
  // console.log("render simulation", (window as any).count);

  const { program, updateProgram, reportOutput, reportView } = props;

  const [initComponent, initView, initOutput] = useSubTool({program, updateProgram, subKey: 'initProgram'})

  const { iterationsCount } = program;

  const iterations = useMemo(() => {
    return _.range(iterationsCount)
  }, [iterationsCount])

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
      <div className="xCol xGap10" style={{padding: 10}}>
        <div className="init-rows xRow xGap10">
          <div className="xRow xGap10">
            <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>init</div>
            <ShowView view={initView} autoFocus={autoFocus} />
          </div>
        </div>
        <hr style={{width: '100%'}}/>
        <div className="xRow xGap10">
          <div className="step-rows xCol xGap10">
            <div className="xRow xGap10">
            <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>step</div>
              <div>
                <input
                  type="range"
                  value={highlightedIndex}
                  onChange={(ev) => setHighlightedIndex(+ev.target.value)}
                  min={0} max={iterationsCount - 1} step={1}/>
                {' '}
                <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{highlightedIndex}</div>
              </div>
            </div>
            <div className="xRow xGap10">
              <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>view</div>
              <ShowView view={viewView} />
            </div>
            <div className="xRow xGap10">
              <div style={{width: 55, textAlign: 'right', fontWeight: 'bold'}}>update</div>
              <ShowView view={upViews[highlightedIndex]} />
            </div>
          </div>
          <ToolOutputView toolOutput={viewOutput} displayReactElementsDirectly={true}/>
        </div>
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
