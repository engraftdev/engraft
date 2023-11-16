import { hasProperty } from "@engraft/shared/lib/hasProperty.js";
import { isObject } from "@engraft/shared/lib/isObject.js";
import { CollectReferences, EngraftPromise, ErrorView, InputHeading, MakeProgram, ShowView, ShowViewWithScope, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolResultWithScope, ToolRun, ToolView, ToolViewRenderProps, Value, Var, VarBindings, VarDefinition, defineTool, hookFork, hookMemo, hookRunTool, hookRunToolWithNewVarBindings, hookThen, hooks, inputFrameBarBackdrop, memoizeProps, newVar, outputBackgroundStyle, randomId, renderWithReact, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import _ from "lodash";
import { CSSProperties, ReactNode, memo, useState } from "react";
import { createPortal } from "react-dom";


export type Program = {
  toolName: 'map',
  inputProgram: ToolProgram,
  itemVar: Var,  // TODO: should be a string, but leave it like this until we have migrations
  itemKeyVarId: string,
  perItemProgram: ToolProgram,
}

const makeProgram: MakeProgram<Program> = (context, defaultCode) => {
  const itemVar = newVar('item');
  return {
    toolName: 'map',
    inputProgram: context.makeSlotWithCode(defaultCode || ''),
    itemVar,
    itemKeyVarId: randomId(),
    perItemProgram: context.makeSlotWithCode(itemVar.id)
  };
};

const collectReferences: CollectReferences<Program> = (program) =>
  [ program.inputProgram, program.perItemProgram, { '-': [program.itemVar] } ]

const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const inputResult = hookRunTool({program: program.inputProgram, varBindings, context});

  const computedStuffP = hookMemo(() => (
    hookThen(inputResult.outputP, (inputOutput) => {
      const inputOutputValue = inputOutput.value;
      if (!(inputOutputValue instanceof Array || isObject(inputOutputValue))) {
        throw new Error("input is not array or object")
      }
      const inputOutputIsArrayLike = hasProperty(inputOutputValue, Symbol.iterator) && hasProperty(inputOutputValue, 'length');

      const itemKeyVar = hookMemo(() => (
        // TODO: defensive for old versions
        program.itemKeyVarId !== undefined
        ? {
            id: program.itemKeyVarId,
            label: inputOutputIsArrayLike ? 'index' : 'key',
          }
        : undefined
      ), [inputOutputIsArrayLike, program.itemKeyVarId])

      const itemResultsWithScope: ToolResultWithScope[] = hookFork((branch) =>
        _.map(inputOutputValue, (inputElem, key) =>
          branch(`${key}`, () => {
            const newVarBindings: VarBindings = hookMemo(() => ({
              [program.itemVar.id]: {var_: program.itemVar, outputP: EngraftPromise.resolve({value: inputElem})},
              // TODO: defensive for old versions
              ...itemKeyVar && {
                [itemKeyVar.id]: {var_: itemKeyVar, outputP: EngraftPromise.resolve({value: key})},
              }
            }), [program.itemVar, inputElem, itemKeyVar, key]);
            return hookRunToolWithNewVarBindings(
              {program: program.perItemProgram, varBindings, newVarBindings, context}
            );
          })
        )
      )

      return {
        inputOutput,
        inputOutputIsArrayLike,
        itemResultsWithScope,
        itemKeyVar,
      }
    })
  ), [inputResult.outputP, program.itemKeyVarId, program.itemVar, program.perItemProgram, varBindings, context])

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => (
    computedStuffP.then(({itemResultsWithScope}) =>
      EngraftPromise.all(
        itemResultsWithScope.map((itemResultWithScope) => itemResultWithScope.result.outputP)
      ).then((itemOutputs) =>
        ({value: itemOutputs.map((itemOutput) => itemOutput.value)})
      )
    )
  ), [computedStuffP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
        computedStuffP={computedStuffP}
      />
    ),
  }), [computedStuffP, inputResult, props]);

  return {outputP, view};
}));

export default defineTool({ name: 'map', makeProgram, collectReferences, run });


const MAX_ITEMS_DISPLAYED = 10;

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
  computedStuffP: EngraftPromise<{
    inputOutput: ToolOutput,
    inputOutputIsArrayLike: boolean,
    itemResultsWithScope: ToolResultWithScope<ToolProgram>[],
    itemKeyVar: Var | undefined,
  }>
}) => {
  const { program, updateProgram, autoFocus, frameBarBackdropElem, inputResult, computedStuffP } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(0 as number | null);

  const computedStuffState = usePromiseState(computedStuffP);

  let tabs: ReactNode = null;
  let perItem: ReactNode = null;
  if (computedStuffState.status === 'fulfilled') {
    const { inputOutput, inputOutputIsArrayLike, itemResultsWithScope, itemKeyVar } = computedStuffState.value;
    const numItems = itemResultsWithScope.length;
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

    const shownIndex = Math.min(hoveredIndex !== null ? hoveredIndex : selectedIndex, itemResultsWithScope.length - 1);

    if (shownIndex >= 0) {
      perItem = <div className="xCol xGap10 xPad10" style={{ border: '3px solid lightblue' }}>
        <div className="xRow xAlignTop xGap10">
          <div className="xCol xAlignLeft">
            <VarDefinition var_={program.itemVar} attach="down"/>
            <div className='xPad10 xRelative' style={{alignSelf: 'stretch', ...outputBackgroundStyle}}>
              <Value value={Object.values(inputOutput.value as any)[shownIndex]} />
            </div>
          </div>
          { itemKeyVar &&
            <div className="xCol xAlignLeft">
              <VarDefinition var_={itemKeyVar} attach="down"/>
              <div className='xPad10 xRelative' style={{alignSelf: 'stretch', ...outputBackgroundStyle}}>
                <Value value={inputOutputIsArrayLike ? shownIndex : Object.keys(inputOutput.value as any)[shownIndex]} />
              </div>
            </div>
          }
        </div>
        <div>
          <ShowViewWithScope
            resultWithScope={itemResultsWithScope[shownIndex]}
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
        {computedStuffState.status === 'rejected' &&
          <ErrorView error={computedStuffState.reason}/>
        }
        { tabs }
      </div>

      {perItem}
    </div>
  );
});
