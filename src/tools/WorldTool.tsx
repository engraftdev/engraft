import _ from "lodash";
import { memo, useCallback, useEffect, useMemo } from "react";
import { newVar, ProgramFactory, ProvideVarBinding, ToolProgram, ToolProps, ToolView, Var } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import { useAt, useStateSetOnly } from "src/util/state";
import { codeProgramSetTo } from "./CodeTool";

export interface Program {
  toolName: 'world';
  iterationsCount: number;
  initProgram: ToolProgram;
  stateVar: Var;
  upProgram: ToolProgram;
  viewProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const stateVar = newVar('state');
  return {
    toolName: 'world',
    iterationsCount: 20,
    initProgram: codeProgramSetTo('{}'),
    stateVar,
    upProgram: codeProgramSetTo(stateVar.id),
    viewProgram: codeProgramSetTo(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
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

  const [upComponents, upViews, upOutputs] = useTools(Object.fromEntries(iterations.map((elem, i) => {
    return [i, {program: upProgram, updateProgram: updateUpProgram}]
  })))

  const [viewComponent, viewView, viewOutput] = useSubTool({program, updateProgram, subKey: 'viewProgram'})

  useOutput(reportOutput, viewOutput);

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  useEffect(() => {
    if (highlightedIndex > iterationsCount) {
      setHighlightedIndex(Math.max(iterationsCount, 0));
    }
  }, [highlightedIndex, iterationsCount, setHighlightedIndex])

  const view: ToolView = useCallback(({autoFocus}) => (
    <div style={{
      padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 10,
      background: 'linear-gradient(to bottom right, rgba(93,157,185,0.05), rgba(243,50,139,0.05))'
      }}>
      <div style={{textAlign: 'right'}}>step</div>
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
      <div style={{textAlign: 'right'}}>init</div>
      <div>
        <ShowView view={initView} autoFocus={autoFocus} />
      </div>
      <div style={{textAlign: 'right'}}>update</div>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        {/* <Value value={(highlightedIndex === 0 ? initOutput : upOutputs[highlightedIndex - 1]) || undefined}
          style={{maxHeight: 30}}/> */}
        <ShowView view={upViews[highlightedIndex]} autoFocus={autoFocus} />
        {/* <Value value={upOutputs[highlightedIndex]?.toolValue || undefined}
          style={{maxHeight: 100}}/> */}
      </div>
      <div style={{textAlign: 'right'}}>view</div>
      <ShowView view={viewView} autoFocus={autoFocus} />
    </div>
  ), [highlightedIndex, initView, iterationsCount, setHighlightedIndex, upViews, viewView]);
  useView(reportView, view);

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
