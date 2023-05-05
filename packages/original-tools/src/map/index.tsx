import { ComputeReferences, EngraftPromise, hookRunTool, newVar, ProgramFactory, references, ShowView, ShowViewWithScope, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolResultWithScope, ToolRun, ToolView, ToolViewRenderProps, usePromiseState, Var, VarBindings } from "@engraft/core";
import { ErrorView, ToolOutputView, VarDefinition } from "@engraft/core-widgets";
import { hookFork, hookLater, hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { isObject } from "@engraft/shared/lib/isObject.js";
import { difference, union } from "@engraft/shared/lib/sets.js";
import { inputFrameBarBackdrop, InputHeading } from "@engraft/toolkit";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import _ from "lodash";
import { CSSProperties, memo, ReactNode, useState } from "react";
import { createPortal } from "react-dom";


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
    inputProgram: slotWithCode(defaultCode || ''),
    itemVar,
    perItemProgram: slotWithCode(itemVar.id)
  };
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.inputProgram), difference(references(program.perItemProgram), [program.itemVar.id]));

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const inputResult = hookRunTool({program: program.inputProgram, varBindings});

  const inputArrayP = hookMemo(() => inputResult.outputP.then((inputOutput) => {
    if (inputOutput.value instanceof Array) {
      return inputOutput.value;
    } else if (isObject(inputOutput.value)) {
      return Object.entries(inputOutput.value);
    } else {
      throw new Error("input is not array or object")
    }
  }), [inputResult]);

  // TODO: This block is pretty bad. Worth thinking about a bit.
  const itemResultsWithScopeP: EngraftPromise<ToolResultWithScope[]> =
    hookMemo(() => {
      const later = hookLater();
      return inputArrayP.then((inputArray) => later(() =>
          hookFork((branch) =>
            inputArray.map((inputElem, i) =>
              branch(`${i}`, () => {
                const newVarBindings: VarBindings = hookMemo(() => ({
                  [program.itemVar.id]: {var_: program.itemVar, outputP: EngraftPromise.resolve({value: inputElem})},
                }), [program.itemVar, inputElem]);
                const itemVarBindings: VarBindings = hookMemo(() => ({
                  ...varBindings,
                  ...newVarBindings,
                }), [varBindings, newVarBindings]);
                const result = hookRunTool(
                  {program: program.perItemProgram, varBindings: itemVarBindings}
                )
                return { result, newScopeVarBindings: newVarBindings };
              })
            )
          )
        )
      );
    }, [inputArrayP, varBindings, program.itemVar, program.perItemProgram])

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => itemResultsWithScopeP.then((itemResultsWithScope) =>
    EngraftPromise.all(itemResultsWithScope.map((itemResultWithScope) => itemResultWithScope.result.outputP)).then((itemOutputs) => {
      return {value: itemOutputs.map((itemOutput) => itemOutput.value)};
    })
  ), [itemResultsWithScopeP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
        itemResultsWithScopeP={itemResultsWithScopeP}
      />,
  }), [inputResult, itemResultsWithScopeP, props]);

  return {outputP, view};
}));


const MAX_ITEMS_DISPLAYED = 10;

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
  itemResultsWithScopeP: EngraftPromise<ToolResultWithScope<ToolProgram>[]>,
}) => {
  const { program, updateProgram, autoFocus, frameBarBackdropElem, inputResult, itemResultsWithScopeP } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(0 as number | null);

  const itemResultsWithScopeState = usePromiseState(itemResultsWithScopeP);

  let tabs: ReactNode = null;
  let perItem: ReactNode = null;
  if (itemResultsWithScopeState.status === 'fulfilled') {
    const numItems = itemResultsWithScopeState.value.length;
    const numTabs = Math.min(numItems, MAX_ITEMS_DISPLAYED);

    tabs = <div className="MapTool-indices xRow xAlignVCenter" style={{alignSelf: 'flex-end'}}>
      {_.range(numTabs).map((elem, i) => {
        let background;
        let trapezoid: CSSProperties = {};
        if (i === selectedIndex) {
          background = 'rgb(173, 216, 230)';
        } else if (i === hoveredIndex) {
          background = 'rgb(200, 240, 250)';
        }
        if (i === hoveredIndex || (hoveredIndex === null && i === selectedIndex)) {
          trapezoid = {
            borderBottom: `10px solid ${background}`,
            marginBottom: -10,
            ...i > 0 && {
              borderLeft: '10px solid transparent',
              marginLeft: -10,
            },
            ...i < numItems - 1 && {
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
            onClick={() => setSelectedIndex(i)}
            onMouseOver={() => setHoveredIndex(i)}
            onMouseOut={() => setHoveredIndex(null)}
          >
            {i}
          </div>
        </div>
      })}
      {numItems > numTabs &&
        <div style={{paddingLeft: 8}}>⋯</div>
      }
    </div>;

    const shownIndex = Math.min(hoveredIndex !== null ? hoveredIndex : selectedIndex, itemResultsWithScopeState.value.length - 1);

    if (shownIndex >= 0) {
      perItem = <div className="xCol xGap10 xPad10" style={{ border: '3px solid lightblue' }}>
        <div className="xRow xAlignTop xGap10">
          <VarDefinition var_={program.itemVar} updateVar={programUP.itemVar.$}/>
          <div style={{lineHeight: 1}}>=</div>
          <div style={{minWidth: 0}}>
            <ToolOutputView outputP={inputResult.outputP.then(output => ({value: (output.value as unknown[])[shownIndex]}))} />
          </div>
        </div>
        <div>
          <ShowViewWithScope
            resultWithScope={itemResultsWithScopeState.value[shownIndex]}
            updateProgram={programUP.perItemProgram.$}
          />
        </div>
      </div>;
    } else {
      perItem = "empty array"
    }
  }

  return (
    <div className="xCol">
      {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <InputHeading
        slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />}
      />
      <div className="MapTool-top xRow xGap10 xPad10">
        {itemResultsWithScopeState.status === 'rejected' &&
          <ErrorView error={itemResultsWithScopeState.reason}/>
        }
        { tabs }
      </div>

      {perItem}
    </div>
  );
});
