import _ from "lodash";
import { memo, useEffect, useMemo } from "react";
import { ComputeReferences, newVar, ProgramFactory, references, ToolProgram, ToolProps, valueOrUndefined, Var } from "src/tools-framework/tools";
import { ShowView, ToolInSet, useOutput, useSubTool, useToolSet, useView } from "src/tools-framework/useSubTool";
import { difference, union } from "src/util/sets";
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

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(
    union(
      references(program.initProgram),
      references(program.upProgram),
      references(program.viewProgram),
    ),
    [program.stateVar.id]
  )

// (window as any).count = 0;

export const Component = memo((props: ToolProps<Program>) => {
  // (window as any).count++;
  // console.log("render simulation", (window as any).count);

  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [initComponent, initView, initOutput] = useSubTool({program, updateProgram, subKey: 'initProgram', varBindings})

  const { iterationsCount } = program;

  const [upProgram, updateUpProgram] = useAt(program, updateProgram, 'upProgram');

  const [upToolSet, upOutputs, upViews] = useToolSet();

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

  const viewVarBindings = useMemo(() => ({
    ...varBindings,
    [program.stateVar.id]: {var_: program.stateVar, output: (upOutputs[highlightedIndex]) || undefined},
  }), [highlightedIndex, program.stateVar, upOutputs, varBindings]);
  const [viewComponent, viewView, viewOutput] = useSubTool({program, updateProgram, subKey: 'viewProgram', varBindings: viewVarBindings})

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

  const perUpVarBindings = useMemo(() => _.range(iterationsCount).map((inputArrayElem, i) =>
    ({
      ...varBindings,
      [program.stateVar.id]: {var_: program.stateVar, output: (i === 0 ? initOutput : upOutputs[i - 1]) || undefined},
    })
  ), [initOutput, iterationsCount, upOutputs, varBindings, program.stateVar]);


  return <>
    {initComponent}
    {perUpVarBindings.map((upVarBindings, i) =>
      <ToolInSet toolSet={upToolSet} keyInSet={`${i}`} program={upProgram} updateProgram={updateUpProgram} varBindings={upVarBindings}/>
    )}
    {viewComponent}
  </>
});
