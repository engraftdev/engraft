import { useCallback } from "react";
import { useEffect, useMemo } from "react";
import { ObjectInspector } from "react-inspector";
import { newVarConfig, ProvideVar, registerTool, ToolConfig, toolIndex, ToolProps, ToolViewRender, VarConfig } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useTools, useView } from "../tools-framework/useSubTool";
import range from "../util/range";
import { useAt, useStateSetOnly } from "../util/state";
import Value from "../view/Value";
import { VarDefinition } from "../view/Vars";



export interface LooperConfig extends ToolConfig {
  toolName: 'looper';
  inputConfig: ToolConfig;
  itemVar: VarConfig;
  perItemConfig: ToolConfig;
}

export function LooperTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LooperConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  const inputArray = useMemo(() => {
    if (!inputOutput) { return null; }

    if (inputOutput.toolValue instanceof Array) {
      return inputOutput.toolValue.map((v) => ({toolValue: v}));
    } else {
      return null;
    }
  }, [inputOutput])

  const inputLength = inputArray?.length || 0;

  const [perItemConfig, updatePerItemConfig] = useAt(config, updateConfig, 'perItemConfig');

  const [perItemComponents, perItemViews, perItemOutputs] = useTools(Object.fromEntries((inputArray || []).map((elem, i) => {
    return [i, {config: perItemConfig, updateConfig: updatePerItemConfig}]
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

  const render: ToolViewRender = useCallback(({autoFocus}) => {
    return (
      <div>
        <div className="row-top" style={{marginBottom: 10}}>
          input <ShowView view={inputView} autoFocus={autoFocus} />
        </div>

        {inputArray &&
          <>
            <div>
              {inputArray.map((elem, i) =>
                <div key={i} style={{display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', padding: 3,
                                    cursor: 'pointer', background: i === highlightedIndex ? 'lightblue' : 'none'}}
                      onClick={() => setHighlightedIndex(i)}>
                  <div style={{pointerEvents: 'none'}}>
                    {/* <Value value={elem.toolValue}/> */}
                    {i}
                  </div>
                </div>
              )}
            </div>
            <div className="row-top" style={{marginTop: 10, marginBottom: 10}}>
              <VarDefinition varConfig={itemVarConfig} updateVarConfig={updateItemVarConfig}/>
              {' = '}
              <Value value={inputArray[highlightedIndex].toolValue} />
            </div>
            <div>
              <ShowView view={perItemViews[highlightedIndex]}/>
            </div>
          </>
        }
      </div>
    );
  }, [highlightedIndex, inputArray, inputView, perItemViews, setHighlightedIndex]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
    {inputArray?.map((inputArrayElem, i) =>
      <ProvideVar key={i} config={config.itemVar} value={inputArrayElem}>
        {perItemComponents[i]}
      </ProvideVar>
    )}
  </>
}
registerTool<LooperConfig>(LooperTool, () => ({
  toolName: 'looper',
  inputConfig: toolIndex['code'].defaultConfig(),
  itemVar: newVarConfig('item'),
  perItemConfig: toolIndex['code'].defaultConfig()
}));

