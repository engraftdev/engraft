import { CSSProperties, memo, useCallback, useEffect, useMemo } from "react";
import { newVar, ProvideVarBinding, registerTool, ToolProgram, ToolProps, ToolValue, ToolView, ToolViewProps, Var } from "src/tools-framework/tools";
import { PerTool, ShowView, useOutput, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import range from "src/util/range";
import { useAt, useStateSetOnly } from "src/util/state";
import { Value } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { codeProgramSetTo } from "./CodeTool";



export interface MapProgram extends ToolProgram {
  toolName: 'map';
  inputProgram: ToolProgram;
  itemVar: Var;
  perItemProgram: ToolProgram;
}

export const MapTool = memo(function MapTool(props: ToolProps<MapProgram>) {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

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

  const [perItemProgram, updatePerItemProgram] = useAt(program, updateProgram, 'perItemProgram');

  const [perItemComponents, perItemViews, perItemOutputs] = useTools(Object.fromEntries((inputArray || []).map((elem, i) => {
    return [i, {program: perItemProgram, updateProgram: updatePerItemProgram}]
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
      <ProvideVarBinding key={i} var_={program.itemVar} value={inputArrayElem}>
        {perItemComponents[i]}
      </ProvideVarBinding>
    )}
  </>
});
registerTool<MapProgram>(MapTool, 'map', (defaultInput) => {
  const itemVar = newVar('item');
  return {
    toolName: 'map',
    inputProgram: codeProgramSetTo(defaultInput || ''),
    itemVar,
    perItemProgram: codeProgramSetTo(itemVar.id),
  };
});


interface MapToolViewProps extends ToolProps<MapProgram>, ToolViewProps {
  inputView: ToolView | null;
  inputArray: ToolValue[] | null;
  perItemViews: PerTool<ToolView | null>;
}

const MapToolView = memo(function MapToolView(props: MapToolViewProps) {
  const { program, updateProgram, autoFocus, inputView, inputArray, perItemViews } = props;

  const [itemVar, updateItemVar] = useAt(program, updateProgram, 'itemVar');

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
              <VarDefinition var_={itemVar} updateVar={updateItemVar}/>
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
