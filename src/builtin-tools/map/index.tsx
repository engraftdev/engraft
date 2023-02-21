import _ from "lodash";
import { CSSProperties, memo, ReactNode } from "react";
import { ComputeReferences, newVar, ProgramFactory, references, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, Var, VarBindings } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { usePromiseState } from "src/engraft/EngraftPromise.react";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hookFork, hookLater, hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { isObject } from "src/util/hasProperty";
import { useStateSetOnly } from "src/util/immutable-react";
import { difference, union } from "src/util/sets";
import { useUpdateProxy } from "src/util/UpdateProxy.react";
import { ErrorView, ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "../slot";


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
  const itemResultsP: EngraftPromise<ToolResult<ToolProgram>[]> =
    hookMemo(() => {
      const later = hookLater();
      return inputArrayP.then((inputArray) => later(() =>
          hookFork((branch) =>
            inputArray.map((inputElem, i) =>
              branch(`${i}`, () => {
                const itemVarBindings: VarBindings = hookMemo(() => ({
                  ...varBindings,
                  [program.itemVar.id]: {var_: program.itemVar, outputP: EngraftPromise.resolve({value: inputElem})},
                }), [varBindings, program.itemVar, inputElem]);
                const itemResult = hookRunTool({program: program.perItemProgram, varBindings: itemVarBindings})
                return itemResult
              })
            )
          )
        )
      );
    }, [inputArrayP, varBindings, program.itemVar, program.perItemProgram])

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => itemResultsP.then((itemResults) =>
    EngraftPromise.all(itemResults.map((itemResult) => itemResult.outputP)).then((itemOutputs) => {
      return {value: itemOutputs.map((itemOutput) => itemOutput.value)};
    })
  ), [itemResultsP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
        itemResultsP={itemResultsP}
      />
  }), [props]);

  return {outputP, view};
}));


const MAX_ITEMS_DISPLAYED = 10;

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
  itemResultsP: EngraftPromise<ToolResult<ToolProgram>[]>,
}) => {
  const { program, updateProgram, autoFocus, inputResult, itemResultsP } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [selectedIndex, setSelectedIndex] = useStateSetOnly(() => 0);
  const [hoveredIndex, setHoveredIndex] = useStateSetOnly(() => 0 as number | null);

  const itemResultsState = usePromiseState(itemResultsP);

  let tabs: ReactNode = null;
  let perItem: ReactNode = null;
  if (itemResultsState.status === 'fulfilled') {
    const numItems = itemResultsState.value.length;
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

    const shownIndex = Math.min(hoveredIndex !== null ? hoveredIndex : selectedIndex, itemResultsState.value.length - 1);

    if (shownIndex >= 0) {
      perItem = <div className="xCol xGap10 xPad10" style={{ border: '3px solid lightblue' }}>
        <div className="xRow xAlignTop xGap10">
          <VarDefinition var_={program.itemVar} updateVar={programUP.itemVar.$}/>
          <div style={{lineHeight: 1}}>=</div>
          <div style={{minWidth: 0}}>
            <ToolOutputView outputP={itemResultsState.value[shownIndex].outputP} />
          </div>
        </div>
        <div>
          <ShowView view={itemResultsState.value[shownIndex].view} updateProgram={programUP.perItemProgram.$}/>
        </div>
      </div>;
    } else {
      perItem = "empty array"
    }
  }

  return (
    <div className="xCol xGap10 xPad10">
      <div className="MapTool-top xRow xGap10">
        <b>input</b> <ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />
        {itemResultsState.status === 'rejected' &&
          <ErrorView error={itemResultsState.reason}/>
        }
        { tabs }
      </div>

      {perItem}
    </div>
  );
});
