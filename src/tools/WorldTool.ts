import _ from "lodash";
import { useMemo } from "react";
import { newVarConfig, registerTool, ToolConfig, ToolProps, VarConfig } from "../tools-framework/tools";
import { useSubTool, useTools } from "../tools-framework/useSubTool";
import { useAt, useStateSetOnly } from "../util/state";
import { codeConfigSetTo } from "./CodeTool";

export interface WorldConfig {
  toolName: 'text';
  iterations: number;
  initConfig: ToolConfig;
  stateVar: VarConfig;
  updateConfig: ToolConfig;
  viewConfig: ToolConfig;
}

export function WorldTool({ config, updateConfig, reportOutput, reportView }: ToolProps<WorldConfig>) {
  const [initComponent, initView, initOutput] = useSubTool({config, updateConfig, subKey: 'initConfig'})

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  const iterations = useMemo(() => {
    return _.range(config.iterations)
  }, [])

  const [upConfig, updateUpConfig] = useAt(config, updateConfig, 'updateConfig');

  const [iterationComponents, iterationViews, iterationOutputs] = useTools(Object.fromEntries(iterations.map((elem, i) => {
    return [i, {config: upConfig, updateConfig: updateUpConfig}]
  })))

  useEffect(() => {
    if (inputArray && highlightedIndex > inputArray.length - 1) {
      setHighlightedIndex(Math.max(inputArray.length - 1, 0));
    }
  }, [highlightedIndex, inputArray, setHighlightedIndex])

  const output = useMemo(() => {
    return {toolValue: range(inputLength).map((i) => perItemOutputs[i]?.toolValue)};
  }, [inputLength, perItemOutputs])
  useOutput(reportOutput, output);

  const [itemVarConfig, updateItemVarConfig] = useAt(config, updateConfig, 'itemVar');

  // const render: ToolViewRender = useCallback(({autoFocus}) => {
  //   return (
  //     <div style={{padding: 10}}>
  //       <div className="row-top" style={{marginBottom: 10}}>
  //         input <ShowView view={inputView} autoFocus={autoFocus} />
  //       </div>

  //       {inputArray &&
  //         <>
  //           <div>
  //             {inputArray.map((elem, i) =>
  //               <div key={i} style={{display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', padding: 3,
  //                                   cursor: 'pointer', background: i === highlightedIndex ? 'lightblue' : 'none'}}
  //                     onClick={() => setHighlightedIndex(i)}>
  //                 <div style={{pointerEvents: 'none'}}>
  //                   {/* <Value value={elem.toolValue}/> */}
  //                   {i}
  //                 </div>
  //               </div>
  //             )}
  //           </div>
  //           <div className="row-top" style={{marginTop: 10, marginBottom: 10}}>
  //             <VarDefinition varConfig={itemVarConfig} updateVarConfig={updateItemVarConfig}/>
  //             {' = '}
  //             <Value value={inputArray[highlightedIndex].toolValue} />
  //           </div>
  //           <div>
  //             <ShowView view={perItemViews[highlightedIndex]}/>
  //           </div>
  //         </>
  //       }
  //     </div>
  //   );
  // }, [highlightedIndex, inputArray, inputView, itemVarConfig, perItemViews, setHighlightedIndex, updateItemVarConfig]);
  // useView(reportView, render, config);

  return <>
    {initComponent}
    {iterations.map((inputArrayElem, i) =>
      <ProvideVar key={i} config={config.itemVar} value={inputArrayElem}>
        {perItemComponents[i]}
      </ProvideVar>
    )}
    {viewComponent}
  </>
}

registerTool<WorldConfig>(WorldTool, () => {
  const stateVar = newVarConfig('state');
  return {
    toolName: 'looper',
    iterations: 10,
    initConfig: codeConfigSetTo('{}'),
    stateVar,
    updateConfig: codeConfigSetTo(stateVar.id),
    viewConfig: codeConfigSetTo(`JSON.stringify(${stateVar.id})`)
  };
});
