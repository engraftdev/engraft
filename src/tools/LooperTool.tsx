import memoize from "fast-memoize";
import React from "react";
import { useEffect, useMemo } from "react";
import { registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView } from "../tools-framework/tools";
import CallFunction from "../util/CallFunction";
import { useSubTool } from "../tools-framework/useSubTool";
import { useAt, useStateSetOnly, useStateUpdateOnly } from "../util/state";



export interface LooperConfig extends ToolConfig {
  toolName: 'looper';
  inputConfig: ToolConfig;
  perItemConfig: ToolConfig;
}


export function LooperTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<LooperConfig>) {
  const [inputComponent, inputMakeView, inputOutput] = useSubTool({context, config, updateConfig, subKey: 'inputConfig'})

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

  useEffect(() => {
    reportView(({autoFocus}) => {
      return (
        <div>
          <h2>looper</h2>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>input</b> {inputMakeView({autoFocus})}
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
                  {highlightedView && <CallFunction f={() => highlightedView({})} />}
                </div>
              </div>
            </div>
          }
        </div>
      );
    })
    return () => reportView(null);
  }, [highlightedIndex, highlightedView, inputArray, reportView, setHighlightedIndex, inputMakeView]);

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

  const perItemContext = React.useMemo(
    () => inputArray &&
      memoize(
        (i: number) => ({...context, item: {toolValue: inputArray[i]}})
      ),
    [context, inputArray]
  );

  return <>
    {inputComponent}
    {inputArray &&
      inputArray.map((item, i) =>
        <PerItemTool
          key={i}
          context={perItemContext!(i)}
          config={perItemConfig}
          updateConfig={updatePerItemConfig}
          reportOutput={reportPerItemOutput(i)}
          reportView={reportPerItemView(i)}
        />
      )
    }
  </>
}
registerTool(LooperTool, {
  toolName: 'looper',
  inputConfig: toolIndex['code'].defaultConfig,
  perItemConfig: toolIndex['code'].defaultConfig
});

