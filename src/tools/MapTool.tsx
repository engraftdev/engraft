import { CSSProperties, memo, useCallback, useEffect, useMemo } from "react";
import { newVarConfig, ProvideVar, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps, VarConfig } from "src/tools-framework/tools";
import { PerTool, ShowView, useOutput, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import range from "src/util/range";
import { useAt, useStateSetOnly } from "src/util/state";
import { Value } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { codeConfigSetTo } from "./CodeTool";



export interface MapConfig extends ToolConfig {
  toolName: 'map';
  inputConfig: ToolConfig;
  itemVar: VarConfig;
  perItemConfig: ToolConfig;
}

export const MapTool = memo(function MapTool(props: ToolProps<MapConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const inputArray = useMemo(() => {
    if (!inputOutput) { return null; }

    if (inputOutput.toolValue instanceof Array) {
      return inputOutput.toolValue.map((v) => ({toolValue: v}));
    } else if (inputOutput.toolValue instanceof Object && inputOutput.toolValue !== null) {
      return Object.entries(inputOutput.toolValue).map((pair) => ({toolValue: pair}))
    } else {
      return null;
    }
  }, [inputOutput])

  const inputLength = inputArray?.length || 0;

  const [perItemConfig, updatePerItemConfig] = useAt(config, updateConfig, 'perItemConfig');

  const [perItemComponents, perItemViews, perItemOutputs] = useTools(Object.fromEntries((inputArray || []).map((elem, i) => {
    return [i, {config: perItemConfig, updateConfig: updatePerItemConfig}]
  })))

  const output = useMemo(() => {
    return {toolValue: range(inputLength).map((i) => perItemOutputs[i]?.toolValue)};
  }, [inputLength, perItemOutputs])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback((viewProps) => (
    <MapToolView
      {...props} {...viewProps}
      inputArray={inputArray}
      inputView={inputView}
      perItemViews={perItemViews}
    />
  ), [inputArray, inputView, perItemViews, props]);
  useView(reportView, view);

  return <>
    {inputComponent}
    {inputArray?.map((inputArrayElem, i) =>
      <ProvideVar key={i} config={config.itemVar} value={inputArrayElem}>
        {perItemComponents[i]}
      </ProvideVar>
    )}
  </>
});
registerTool<MapConfig>(MapTool, 'map', (defaultInput) => {
  const itemVar = newVarConfig('item');
  return {
    toolName: 'map',
    inputConfig: codeConfigSetTo(defaultInput || ''),
    itemVar,
    perItemConfig: codeConfigSetTo(itemVar.id),
  };
});


interface MapToolViewProps extends ToolProps<MapConfig>, ToolViewProps {
  inputView: ToolView | null;
  inputArray: ToolValue[] | null;
  perItemViews: PerTool<ToolView | null>;
}

const MapToolView = memo(function MapToolView(props: MapToolViewProps) {
  const { config, updateConfig, autoFocus, inputView, inputArray, perItemViews } = props;

  const [itemVarConfig, updateItemVarConfig] = useAt(config, updateConfig, 'itemVar');

  const [highlightedIndex, setHighlightedIndex] = useStateSetOnly(0);

  useEffect(() => {
    if (inputArray && highlightedIndex > inputArray.length - 1) {
      setHighlightedIndex(Math.max(inputArray.length - 1, 0));
    }
  }, [highlightedIndex, inputArray, setHighlightedIndex])

  const maxItemsDisplayed = 10;
  let inputArrayTruncated = inputArray;
  if (inputArrayTruncated && inputArrayTruncated.length > maxItemsDisplayed) {
    inputArrayTruncated = inputArrayTruncated.slice(0, maxItemsDisplayed);
  }

  return (
    <div className="xCol xGap10 xPad10">
      <div className="MapTool-top xRow xGap10">
        <b>input</b> <ShowView view={inputView} autoFocus={autoFocus} />
      </div>

      {inputArrayTruncated &&
        <>
          <div className="MapTool-indices xRow">
            {inputArrayTruncated.map((elem, i) => {
              let background = 'none';
              let trapezoid: CSSProperties = {};
              if (i === highlightedIndex) {
                background = 'lightblue';
                trapezoid = {
                  borderBottom: '10px solid lightblue',
                  marginBottom: -10,
                  ...i > 0 && {
                    borderLeft: '10px solid transparent',
                    marginLeft: -10,
                  },
                  ...i < maxItemsDisplayed - 1 && {
                    borderRight: '10px solid transparent',
                    marginRight: -10,
                  },
                };
              }

              return <div key={i} className="xUnclickable" style={trapezoid}>
                <div className="xClickable"
                  style={{
                    border: '1px solid rgba(0,0,0,0.2)', padding: 3,
                    background
                  }}
                  onClick={() => setHighlightedIndex(i)}
                >
                  {i}
                </div>
              </div>
            })}
          </div>
          <div className="xCol xGap10 xPad10" style={{ border: '3px solid lightblue' }}>
            <div className="xRow xAlignTop xGap10">
              <VarDefinition varConfig={itemVarConfig} updateVarConfig={updateItemVarConfig}/>
              <div style={{lineHeight: 1}}>=</div>
              <div style={{minWidth: 0}}>
                <Value value={inputArrayTruncated[highlightedIndex]?.toolValue}/>
              </div>
            </div>
            <div>
              <ShowView view={perItemViews[highlightedIndex]}/>
            </div>
          </div>
        </>
      }
    </div>
  );
})
