import _ from "lodash";
import { useCallback, useEffect, useMemo } from "react";
import { newVarConfig, ProvideVar, registerTool, ToolConfig, ToolProps, ToolViewRender, VarConfig } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useTools, useView } from "../tools-framework/useSubTool";
import { useAt, useStateSetOnly } from "../util/state";
import Value from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";

export interface WorldConfig {
  toolName: 'world';
  iterationsCount: number;
  initConfig: ToolConfig;
  stateVar: VarConfig;
  updateConfig: ToolConfig;
  viewConfig: ToolConfig;
}

export function WorldTool({ config, updateConfig, reportOutput, reportView }: ToolProps<WorldConfig>) {
  const [initComponent, initView, initOutput] = useSubTool({config, updateConfig, subKey: 'initConfig'})

  const [iterationsCount, updateIterationsCount] = useAt(config, updateConfig, 'iterationsCount');

  const iterations = useMemo(() => {
    return _.range(config.iterationsCount)
  }, [config.iterationsCount])

  const [upConfig, updateUpConfig] = useAt(config, updateConfig, 'updateConfig');

  const [upComponents, upViews, upOutputs] = useTools(Object.fromEntries(iterations.map((elem, i) => {
    return [i, {config: upConfig, updateConfig: updateUpConfig}]
  })))

  const [viewComponent, viewView, viewOutput] = useSubTool({config, updateConfig, subKey: 'viewConfig'})

  useOutput(reportOutput, viewOutput);

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  useEffect(() => {
    if (highlightedIndex > iterationsCount) {
      setHighlightedIndex(Math.max(iterationsCount, 0));
    }
  }, [highlightedIndex, iterationsCount, setHighlightedIndex])

  const render: ToolViewRender = useCallback(function R({autoFocus}) {
    return (
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
    );
  }, [highlightedIndex, initView, iterationsCount, setHighlightedIndex, upViews, viewView]);
  useView(reportView, render, config);

  return <>
    {initComponent}
    {iterations.map((inputArrayElem, i) =>
      <ProvideVar key={i} config={config.stateVar} value={(i === 0 ? initOutput : upOutputs[i - 1]) || undefined}>
        {upComponents[i]}
      </ProvideVar>
    )}
    <ProvideVar config={config.stateVar} value={(upOutputs[highlightedIndex]) || undefined}>
      {viewComponent}
    </ProvideVar>
  </>
}

registerTool<WorldConfig>(WorldTool, () => {
  const stateVar = newVarConfig('state');
  return {
    toolName: 'world',
    iterationsCount: 20,
    initConfig: codeConfigSetTo('{}'),
    stateVar,
    updateConfig: codeConfigSetTo(stateVar.id),
    viewConfig: codeConfigSetTo(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
  };
});
