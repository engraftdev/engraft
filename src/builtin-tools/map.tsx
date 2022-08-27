import { CSSProperties, memo, useEffect, useMemo } from "react";
import { hasValue, newVar, ProgramFactory, ProvideVarBinding, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined, Var } from "src/tools-framework/tools";
import { PerTool, ShowView, useOutput, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import range from "src/util/range";
import { useAt, useStateSetOnly } from "src/util/state";
import { Value } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";


export type Program = {
  toolName: 'map';
  inputProgram: ToolProgram;
  itemVar: Var;
  perItemProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const itemVar = newVar('item');
  return {
    toolName: 'map',
    inputProgram: slotSetTo(defaultCode || ''),
    itemVar,
    perItemProgram: slotSetTo(itemVar.id)
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  const inputArray = useMemo(() => {
    if (!hasValue(inputOutput)) { return null; }

    if (inputOutput.value instanceof Array) {
      return inputOutput.value.map((v) => ({value: v}));
    } else if (inputOutput.value instanceof Object && inputOutput.value !== null) {
      return Object.entries(inputOutput.value).map((pair) => ({value: pair}))
    } else {
      return null;
    }
  }, [inputOutput])

  const inputLength = inputArray?.length || 0;

  const [perItemProgram, updatePerItemProgram] = useAt(program, updateProgram, 'perItemProgram');

  const [perItemComponents, perItemViews, perItemOutputs] = useTools(Object.fromEntries((inputArray || []).map((elem, i) => {
    return [i, {program: perItemProgram, updateProgram: updatePerItemProgram}]
  })))

  useOutput(reportOutput, useMemo(() => ({
    value: range(inputLength).map((i) => valueOrUndefined(perItemOutputs[i]))
  }), [inputLength, perItemOutputs]));

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <MapToolView
        {...props} {...viewProps}
        inputArray={inputArray}
        inputView={inputView}
        perItemViews={perItemViews}
      />
  }), [inputArray, inputView, perItemViews, props]));

  return <>
    {inputComponent}
    {inputArray?.map((inputArrayElem, i) =>
      <ProvideVarBinding key={i} var_={program.itemVar} value={inputArrayElem}>
        {perItemComponents[i]}
      </ProvideVarBinding>
    )}
  </>
});


interface MapToolViewProps extends ToolProps<Program>, ToolViewRenderProps {
  inputView: ToolView | null;
  inputArray: ToolOutput[] | null;
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
            {inputArray && inputArray.length > maxItemsDisplayed &&
              <div style={{padding: 3, paddingLeft: 8}}>⋯</div>
            }
          </div>
          <div className="xCol xGap10 xPad10" style={{ border: '3px solid lightblue' }}>
            <div className="xRow xAlignTop xGap10">
              <VarDefinition var_={itemVar} updateVar={updateItemVar}/>
              <div style={{lineHeight: 1}}>=</div>
              <div style={{minWidth: 0}}>
                <Value value={valueOrUndefined(inputArrayTruncated[highlightedIndex])}/>
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
