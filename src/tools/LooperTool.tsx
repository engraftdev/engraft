import memoize from "fast-memoize";
import React, { useCallback } from "react";
import { useEffect, useMemo } from "react";
import { AddToEnvContext, registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt, useStateSetOnly, useStateUpdateOnly } from "../util/state";



export interface LooperConfig extends ToolConfig {
  toolName: 'looper';
  inputConfig: ToolConfig;
  perItemConfig: ToolConfig;
}


export function LooperTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LooperConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);
  const [highlightedView, setHighlightedView] = useStateSetOnly<ToolView | null>(null)

  const [outputArray, updateOutputArray] = useStateUpdateOnly<unknown[]>([]);

  const inputArray = useMemo(() => {
    if (!inputOutput) { return; }

    if (inputOutput.toolValue instanceof Array) {
      return inputOutput.toolValue;
    } else {
      return null;
    }
  }, [inputOutput])

  const inputLength = inputArray?.length || 0;

  useEffect(() => {
    if (inputLength < outputArray.length) {
      updateOutputArray((outputArray) => outputArray.slice(0, inputLength));
    }
  }, [inputLength, outputArray.length, updateOutputArray])

  useEffect(() => {
    if (inputArray && highlightedIndex > inputArray.length - 1) {
      setHighlightedIndex(inputArray.length - 1);
    }
  }, [highlightedIndex, inputArray, setHighlightedIndex])

  useEffect(() => {
    reportOutput({toolValue: inputArray ? outputArray : undefined});
  }, [inputArray, outputArray, reportOutput])

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
                  {JSON.stringify(elem)}
                </div>
              )}
              <div>
                <ShowView view={highlightedView}/>
              </div>
            </div>
          </div>
        }
      </div>
    );
  }, [highlightedIndex, highlightedView, inputArray, inputView, setHighlightedIndex]);
  useView(reportView, render, config);

  const PerItemTool = toolIndex[config.perItemConfig.toolName];

  const [perItemConfig, updatePerItemConfig] = useAt(config, updateConfig, 'perItemConfig');

  const reportPerItemView = React.useMemo(
    () =>
      memoize(
        (i: number) => (view: ToolView | null) => {
          if (i === highlightedIndex) {
            setHighlightedView(view);
          }
        }
      ),
    [highlightedIndex, setHighlightedView]
  );

  const reportPerItemOutput = React.useMemo(
    () =>
      memoize(
        (i: number) => (value: ToolValue | null) => {
          updateOutputArray((outputArray) => {
            let newOutputArray = outputArray.slice();
            newOutputArray[i] = value?.toolValue;
            return newOutputArray;
          });
        }
      ),
    [updateOutputArray]
  );

  const perItemBinding = React.useMemo(
    () => inputArray &&
      memoize(
        (i: number) => ({item: {toolValue: inputArray[i]}})
      ),
    [inputArray]
  );

  return <>
    {inputComponent}
    {inputArray &&
      inputArray.map((item, i) =>
        <AddToEnvContext value={perItemBinding!(i)}>
          <PerItemTool
            key={i}
            config={perItemConfig}
            updateConfig={updatePerItemConfig}
            reportOutput={reportPerItemOutput(i)}
            reportView={reportPerItemView(i)}
          />
        </AddToEnvContext>
      )
    }
  </>
}
registerTool(LooperTool, {
  toolName: 'looper',
  inputConfig: toolIndex['code'].defaultConfig,
  perItemConfig: toolIndex['code'].defaultConfig
});

