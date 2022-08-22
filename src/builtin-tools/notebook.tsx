import _ from "lodash";
import { ChangeEvent, Fragment, memo, useCallback, useEffect, useMemo } from "react";
import { VarBindingsContext, newVar, PossibleVarBindingsContext, PossibleVarBinding, ProgramFactory, ToolProgram, ToolProps, ToolOutput, ToolView, Var, VarBinding, hasValue } from "src/tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "src/tools-framework/useSubTool";
import { AddObjToContext } from "src/util/context";
import { MenuMaker, useContextMenu } from "src/util/useContextMenu";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "src/util/state";
import { Use } from "src/util/Use";
import { objEqWith, refEq, useDedupe } from "src/util/useDedupe";
import useHover from "src/util/useHover";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { codeProgramSetTo } from "./code";


export type Program = {
  toolName: 'notebook';
  cells: Cell[];
  prevVar: Var;
  outputBelowInput?: boolean;
}

interface Cell {
  var_: Var;  // empty label if unlabelled, natch
  program: ToolProgram;
  upstreamIds: {[id: string]: true};
  // pinning?
  // output?
}

export const programFactory: ProgramFactory<Program> = (defaultInput) => {
  return {
    toolName: 'notebook',
    cells: [
      { var_: newVar(defaultCellLabels[0]), program: codeProgramSetTo(defaultInput || ''), upstreamIds: {} }
    ],
    prevVar: newVar('prev')
  };
}

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolOutput | null}>({});

  const reportCellView = useCallback((id: string, view: ToolView | null) => {
    // console.log("reportCellView", id);
    updateKeys(updateViews, {[id]: view})
  }, [updateViews])
  const reportCellOutput = useCallback((id: string, output: ToolOutput | null) => {
    // console.log("reportCellOutput", id);
    updateKeys(updateOutputs, {[id]: output})
  }, [updateOutputs])

  useView(reportView, useMemo(() => ({
    render: () => <View {...props} outputs={outputs} views={views} />
  }), [outputs, props, views]));

  useOutput(reportOutput, useMemo(() => {
    const lastCell = cells[cells.length - 1] as Cell | null;
    if (!lastCell) {
      return null;
    }
    return outputs[lastCell.var_.id];
  }, [cells, outputs]));

  // const newBindings = useMemo(() => {
  //   return {};
  // }, []);

  return <>{cells.map((cell) =>
    <CellModel
      key={cell.var_.id}
      id={cell.var_.id}
      cells={cells}
      updateCells={updateCells}
      outputs={outputs}
      reportView={reportCellView}
      reportOutput={reportCellOutput}
      prevVar={program.prevVar}
    />
  )}</>;
})

const defaultCellLabels = _.range(1, 1000).map((n) => `cell ${n}`);


type ViewProps = ToolProps<Program> & {
  outputs: {[id: string]: ToolOutput | null},
  views: {[id: string]: ToolView | null},
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, views, outputs } = props;

  const [outputBelowInput, updateOutputBelowInput] = useAt(program, updateProgram, 'outputBelowInput');
  const onChangeOutputBelowInput = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    updateOutputBelowInput(() => ev.target.checked);
  }, [updateOutputBelowInput]);

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const smallestUnusedLabel = defaultCellLabels.find((label) =>
    !cells.find((cell) => cell.var_.label === label)
  )!

  const notebookMenuMaker: MenuMaker = useCallback((closeMenu) => <>
    <MyContextMenuHeading>Notebook</MyContextMenuHeading>
    <div className="MenuItem">
      <input type="checkbox" checked={outputBelowInput} onChange={(ev) => updateOutputBelowInput(() => ev.target.checked)}/> Output below input
    </div>
  </>, [outputBelowInput, updateOutputBelowInput]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      {notebookMenuMaker(closeMenu)}
    </MyContextMenu>
  , [notebookMenuMaker]));

  return (
    <div className="NotebookTool xPad10" onContextMenu={openMenu}>
      { menuNode }
      {/* TODO: figure out where to put 'output below input' */}
      <div style={{display: 'none'}}>
        <label>
          <input
            type="checkbox"
            checked={outputBelowInput}
            onChange={onChangeOutputBelowInput}
            style={{marginRight: 5}}
          />
          output below input
        </label>
      </div>
      <div className="xChildrenMinWidth0"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 20, rowGap: 10
        }}>
        {cells.map((cell, i) =>
          <Fragment key={cell.var_.id}>
            <RowDivider i={i} updateCells={updateCells} smallestUnusedLabel={smallestUnusedLabel} prevVar={program.prevVar}/>
            <CellView cell={cell}
              // TODO: memoize these?
              updateCell={atIndex(updateCells, i)}
              removeCell={() => {
                const newCells = [...cells];
                newCells.splice(i, 1);
                updateCells(() => newCells);
              }}
              toolOutput={outputs[cell.var_.id]} toolView={views[cell.var_.id]}
              notebookMenuMaker={notebookMenuMaker}
              outputBelowInput={outputBelowInput || false}
            />
          </Fragment>
        )}
        <RowDivider i={cells.length} updateCells={updateCells} smallestUnusedLabel={smallestUnusedLabel} prevVar={program.prevVar}/>
      </div>
    </div>
  );
})

interface RowDividerProps {
  i: number;
  updateCells: Updater<Cell[]>;
  smallestUnusedLabel: string;
  prevVar: Var;
}

const RowDivider = memo(function RowDivider({i, updateCells, smallestUnusedLabel, prevVar}: RowDividerProps) {
  // return null;

  const onClick = useCallback(() => {
    updateCells((oldCells) => {
      let newCells = oldCells.slice();
      newCells.splice(i, 0, {
        var_: newVar(smallestUnusedLabel),
        program: codeProgramSetTo(i === 0 ? '' : prevVar.id),
        upstreamIds: {},
      });
      return newCells;
    })
  }, [i, prevVar.id, smallestUnusedLabel, updateCells]);

  // const [hoverRef, isHovered] = useHover();

  return <Use hook={useHover}>
    {([hoverRef, isHovered]) =>
      <div ref={hoverRef} className="xCol xAlignVCenter xClickable"
        style={{gridColumn: '1/4', height: 10}}
        onClick={onClick}
      >
        {isHovered &&
          <div className="xCenter"
            style={{borderTop: isHovered ? `1px solid rgba(0,0,0,0.5)` : '1px solid rgba(0,0,0,0.2)', height: 0}}
          >
            <div style={{background: 'white', color: 'rgba(0,0,0,0.4)', position: 'relative', top: -3, pointerEvents: 'none'}}>
              insert row
            </div>
          </div>
        }
      </div>
    }
    </Use>;
});


interface CellModelProps {
  id: string;

  cells: Cell[];
  updateCells: Updater<Cell[]>;

  outputs: {[id: string]: ToolOutput | null};

  reportView: (id: string, view: ToolView | null) => void;
  reportOutput: (id: string, value: ToolOutput | null) => void;

  prevVar: Var;
}

const CellModel = memo(function CellModel({id, cells, updateCells, outputs, reportView, reportOutput, prevVar}: CellModelProps) {
  const i = useMemo(() => {
    const i = cells.findIndex((cell) => cell.var_.id === id);
    if (i === -1) {
      throw new Error("internal error: cell not found");
    }
    return i;
  }, [cells, id]);

  const [cell, updateCell] = useAtIndex(cells, updateCells, i);
  const [program, updateProgram] = useAt(cell, updateCell, 'program');

  const [component, view, output] = useTool({ program, updateProgram })

  useEffect(() => reportView(id, view), [id, reportView, view]);
  useEffect(() => reportOutput(id, output), [id, output, reportOutput]);

  const prevVal: ToolOutput | null | undefined = useMemo(() => {
    const prevCell: Cell | undefined = cells[i - 1];
    if (prevCell) {
      return outputs[prevCell.var_.id];
    }
  }, [cells, i, outputs])
  const prevVarContext = useMemo(() => {
    if (prevVal) {
      const prevVarBinding = {
        var_: prevVar,
        value: prevVal,
      };
      return {[prevVar.id]: prevVarBinding};
    } else {
      return undefined;
    }
  }, [prevVal, prevVar])

  const newVarBindings = useDedupe(useMemo(() => {
    let result: {[label: string]: VarBinding} = {...prevVarContext};
    cells.forEach((otherCell) => {
      if (cell.upstreamIds[otherCell.var_.id]) {
        result[otherCell.var_.id] = {var_: otherCell.var_, value: outputs[otherCell.var_.id] || undefined};  // OH NO will this infinity?
      }
    });
    return result;
  }, [cell.upstreamIds, cells, outputs, prevVarContext]), objEqWith(objEqWith(refEq)))

  // TODO: exclude things that are already present? or does this happen elsewhere
  const newPossibleVarBindings = useDedupe(useMemo(() => {
    let result: {[label: string]: PossibleVarBinding} = {};
    cells.forEach((otherCell) => {
      if (otherCell !== cell && otherCell.var_.label.length > 0) {
        result[otherCell.var_.id] = {var_: otherCell.var_, request: () => updateKeys(at(updateCell, 'upstreamIds'), {[otherCell.var_.id]: true})};
      }
    });
    return result;
  }, [cell, cells, updateCell]), objEqWith(objEqWith(refEq)))


  return <AddObjToContext context={VarBindingsContext} obj={newVarBindings}>
    <AddObjToContext context={PossibleVarBindingsContext} obj={newPossibleVarBindings}>
      {component}
    </AddObjToContext>
  </AddObjToContext>;
});




interface CellViewProps {
  cell: Cell;
  updateCell: Updater<Cell>;

  toolOutput: ToolOutput | null,
  toolView: ToolView | null,

  removeCell: () => void;

  notebookMenuMaker: MenuMaker;

  outputBelowInput: boolean;
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, updateCell, toolView, toolOutput, removeCell, notebookMenuMaker, outputBelowInput} = props;

  const [var_, updateVar] = useAt(cell, updateCell, 'var_');

  const alreadyDisplayed = hasValue(toolOutput) && toolOutput.alreadyDisplayed;

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Cell</MyContextMenuHeading>
      <button
        onClick={() => {
          removeCell();
          closeMenu();
        }}
      >
        Delete
      </button>
      {notebookMenuMaker(closeMenu)}
    </MyContextMenu>
  , [notebookMenuMaker, removeCell]));

  return <>
    {menuNode}
    <div className="NotebookTool-CellView-cell-cell" onContextMenu={openMenu}>
      <div className="xRow xGap10 xStickyTop10">
        <div className="xExpand"/>
        <VarDefinition var_={var_} updateVar={updateVar}/>
        <div className="xLineHeight1">=</div>
      </div>
    </div>
    <div className="NotebookTool-CellView-tool-cell xCol" style={{...(alreadyDisplayed || outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
      <div className="xStickyTop10">
        <ShowView view={toolView}/>
      </div>
    </div>
    { !alreadyDisplayed &&
      <div className="NotebookTool-CellView-output-cell" style={{...(outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
        <div className="xStickyTop10">
          <ToolOutputView toolValue={toolOutput}/>
        </div>
      </div>
    }
  </>
});
