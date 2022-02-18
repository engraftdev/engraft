import { useCallback } from "react";
import { useEffect, useMemo } from "react";
import { EnvContext, registerTool, ToolConfig, toolIndex, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useTools, useView } from "../tools-framework/useSubTool";
import { AddToContext } from "../util/context";
import range from "../util/range";
import { useAt, useStateSetOnly } from "../util/state";



export interface LooperConfig extends ToolConfig {
  toolName: 'looper';
  inputConfig: ToolConfig;
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

  const render: ToolViewRender = useCallback(({autoFocus}) => {
    return (
      <div>
        <h2>looper</h2>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>input</b> <ShowView view={inputView} autoFocus={autoFocus} />
        </div>

        {inputArray &&
          <div className="row-top">
            <b>for each</b>
            <div style={{display: 'inline-block'}}>
              {inputArray.map((elem, i) =>
                <div key={i} style={{display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', padding: 3, cursor: 'pointer', background: i === highlightedIndex ? 'lightblue' : 'none'}}
                      onClick={() => setHighlightedIndex(i)}>
                  {JSON.stringify(elem.toolValue)}
                </div>
              )}
              <div>
                <ShowView view={perItemViews[highlightedIndex]}/>
              </div>
            </div>
          </div>
        }
      </div>
    );
  }, [highlightedIndex, inputArray, inputView, perItemViews, setHighlightedIndex]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
    {inputArray?.map((inputArrayElem, i) =>
      <AddToContext key={i} context={EnvContext} k='item' v={inputArrayElem}>
        {perItemComponents[i]}
      </AddToContext>
    )}
  </>
}
registerTool(LooperTool, {
  toolName: 'looper',
  inputConfig: toolIndex['code'].defaultConfig,
  perItemConfig: toolIndex['code'].defaultConfig
});

