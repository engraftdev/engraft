import _ from "lodash";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { newVarConfig, ProvideVar, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps, VarConfig } from "../tools-framework/tools";
import { PerTool, ShowView, useOutput, useSubTool, useTools, useView } from "../tools-framework/useSubTool";
import range from "../util/range";
import { useAt, useStateSetOnly } from "../util/state";
import { flexRow } from "../view/styles";
import { Value } from "../view/Value";
import { VarDefinition } from "../view/Vars";
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
registerTool<MapConfig>(MapTool, 'map', () => {
  const itemVar = newVarConfig('item');
  return {
    toolName: 'map',
    inputConfig: codeConfigSetTo(''),
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

  const [mainDiv, setMainDiv] = useState<HTMLDivElement | null>(null)
  const [indexBoxDiv, setIndexBoxDiv] = useState<HTMLDivElement | null>(null)
  const [perItemBoxDiv, setPerItemBoxDiv] = useState<HTMLDivElement | null>(null)

  const [perItemBoxDivResizes, setPerItemBoxDivResizes] = useState(0);

  useEffect(() => {
    if (perItemBoxDiv) {
      const observer = new ResizeObserver(() => setPerItemBoxDivResizes((n) => n + 1));
      observer.observe(perItemBoxDiv);
      return () => observer.disconnect();
    }
  }, [perItemBoxDiv])

  const trapezoidPoints = useMemo(() => {
    if (!mainDiv || !indexBoxDiv || !perItemBoxDiv) {
      return [];
    }

    void perItemBoxDivResizes;  // re-run this on resizes

    const mainDivRect = mainDiv.getBoundingClientRect();
    const indexBoxDivRect = indexBoxDiv.getBoundingClientRect()
    const perItemBoxDivRect = perItemBoxDiv.getBoundingClientRect()

    return [
      [indexBoxDivRect.left - mainDivRect.x, indexBoxDivRect.bottom - mainDivRect.y],
      [indexBoxDivRect.right - mainDivRect.x, indexBoxDivRect.bottom - mainDivRect.y],
      [perItemBoxDivRect.right - mainDivRect.x, perItemBoxDivRect.top - mainDivRect.y],
      // [perItemBoxDivRect.right - mainDivRect.x, perItemBoxDivRect.bottom - mainDivRect.y],
      // [perItemBoxDivRect.left - mainDivRect.x, perItemBoxDivRect.bottom - mainDivRect.y],
      [perItemBoxDivRect.left - mainDivRect.x, perItemBoxDivRect.top - mainDivRect.y],
    ];
  }, [indexBoxDiv, mainDiv, perItemBoxDiv, perItemBoxDivResizes]);

  const maxItemsDisplayed = 10;
  let inputArrayTruncated = inputArray;
  if (inputArrayTruncated && inputArrayTruncated.length > maxItemsDisplayed) {
    inputArrayTruncated = inputArrayTruncated.slice(0, maxItemsDisplayed);
  }

  return (
    <div ref={setMainDiv} style={{padding: 10, position: 'relative'}}>
      <div className="row-top" style={{marginBottom: 10, ...flexRow(), gap: 10}}>
        <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
      </div>

      {inputArrayTruncated &&
        <>
          <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <polygon
              className="ExpansionTrapezoid-trapezoid"
              points={_.flatten(trapezoidPoints).join(' ')}
              fill="lightblue"
              // fill="transparent" stroke="lightblue" strokeWidth={3}
            />
          </svg>
          <div>
            {inputArrayTruncated.map((elem, i) =>
              <div key={i} style={{display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', padding: 3,
                                  cursor: 'pointer', background: i === highlightedIndex ? 'lightblue' : 'none'}}
                    onClick={() => setHighlightedIndex(i)}
                    ref={i === highlightedIndex ? setIndexBoxDiv : undefined}>
                <div style={{pointerEvents: 'none'}}>
                  {/* <Value value={elem.toolValue}/> */}
                  {i}
                </div>
              </div>
            )}
          </div>
          <div ref={setPerItemBoxDiv} style={{
              border: '3px solid lightblue',
              padding: 10, marginTop: 10}}>
            <div className="row-top" style={{marginBottom: 10}}>
              <VarDefinition varConfig={itemVarConfig} updateVarConfig={updateItemVarConfig}/>
              {' = '}
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
