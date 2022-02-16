import memoize from "fast-memoize";
import React from "react";
import { useEffect, useMemo } from "react";
import FunctionComponent from "../util/CallFunction";
import { registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView } from "../tools-framework/tools";
import useStrictState, { fromSetterUnsafe, subSetter } from "../util/useStrictState";
import CallFunction from "../util/CallFunction";
import { useSubTool } from "../tools-framework/useSubTool";



export interface LooperConfig extends ToolConfig {
  toolName: 'looper';
  inputConfig: ToolConfig;
  perItemConfig: ToolConfig;
}


export function LooperTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<LooperConfig>) {
  const [inputArray, setInputArray] = useStrictState<unknown[] | null>(null)

  const input = useSubTool({context, config, reportConfig, subKey: 'inputConfig'})

  const [highlightedIndex, setHighlightedIndex] = useStrictState(0);
  const [highlightedView, setHighlightedView] = useStrictState<ToolView | null>(null)

  const [outputArray, setOutputArray] = useStrictState<unknown[]>([]);

  useEffect(() => {
    if (!input.value) { return; }

    if (input.value.toolValue instanceof Array) {
      setInputArray.set(input.value.toolValue);
    } else {
      setInputArray.set(null);
    }
  }, [input.value, setInputArray])

  const inputLength = inputArray?.length || 0;

  useEffect(() => {
    if (inputLength < outputArray.length) {
      setOutputArray.set(outputArray.slice(0, inputLength));
    }
  }, [inputLength, outputArray, outputArray.length, setOutputArray])

  useEffect(() => {
    if (inputArray && highlightedIndex > inputArray.length - 1) {
      setHighlightedIndex.set(inputArray.length - 1);
    }
  }, [inputArray?.length, highlightedIndex, inputArray, setHighlightedIndex])

  useEffect(() => {
    reportOutput.set({toolValue: inputArray ? outputArray : undefined});
  }, [inputArray, outputArray, reportOutput])

  useEffect(() => {
    reportView.set(() => {
      return (
        <div>
          <h2>looper</h2>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>input</b> {input.makeView({})}
          </div>

          {inputArray &&
            <div className="row-top">
              <b>for each</b>
              <div style={{display: 'inline-block'}}>
                {inputArray.map((elem, i) =>
                  <div key={i} style={{display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', padding: 3, cursor: 'pointer', background: i === highlightedIndex ? 'lightblue' : 'none'}}
                        onClick={() => setHighlightedIndex.set(i)}>
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
    return () => reportView.set(null);
  }, [config, reportView, reportConfig, input.makeView, inputArray, highlightedIndex, highlightedView, setHighlightedIndex]);

  const PerItemTool = toolIndex[config.perItemConfig.toolName];

  const forwardPerItemConfig = useMemo(() => subSetter<LooperConfig, 'perItemConfig'>(reportConfig, 'perItemConfig'), [reportConfig]);

  const reportPerItemView = React.useMemo(
    () =>
      memoize(
        (i: number) => fromSetterUnsafe((view: ToolView | null) => {
          if (i === highlightedIndex) {
            setHighlightedView.set(view);
          }
        })
      ),
    [highlightedIndex, setHighlightedView]
  );

  const reportPerItemOutput = React.useMemo(
    () =>
      memoize(
        (i: number) => fromSetterUnsafe((value: ToolValue | null) => {
          setOutputArray.update((outputArray) => {
            let newOutputArray = outputArray.slice();
            newOutputArray[i] = value?.toolValue;
            return newOutputArray;
          });
        })
      ),
    [setOutputArray]  // no!
  );

  const contextPerItem = React.useMemo(
    () => inputArray &&
      memoize(
        (i: number) => ({...context, item: {toolValue: inputArray[i]}})
      ),
    [context, inputArray]
  );

  return <>
    {input.component}
    {inputArray &&
      inputArray.map((item, i) =>
        <PerItemTool
          key={i}
          context={contextPerItem!(i)}
          config={config.perItemConfig}
          reportConfig={forwardPerItemConfig}
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

