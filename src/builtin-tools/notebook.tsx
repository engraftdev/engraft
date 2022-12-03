import { Fragment, memo, useCallback, useMemo } from "react";
import { hasValue, newVar, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, Var, VarBinding, VarBindings } from "src/tools-framework/tools";
import { ShowView, ToolInSet, ToolSet, useOutput, useToolSet, useView } from "src/tools-framework/useSubTool";
import { atIndices, removers, Updater, useAt, useAtIndex } from "src/util/state";
import { alphaLabels, unusedLabel } from "src/util/unusedLabel";
import { updateF } from "src/util/updateF";
import { Use } from "src/util/Use";
import { MenuMaker, useContextMenu } from "src/util/useContextMenu";
import { objEqWith, refEq, useDedupe } from "src/util/useDedupe";
import useHover from "src/util/useHover";
import useSize from "src/util/useSize";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import ScrollShadow from "src/view/ScrollShadow";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";


export type Program = {
  toolName: 'notebook';
  cells: Cell[];
  prevVar: Var;  // this should just be an id, because we're generating new prevVars for each cell now
  outputBelowInput?: boolean;
}

interface Cell {
  var_: Var;  // empty label if unlabelled, natch
  program: ToolProgram;
  outputManualHeight: number | undefined | 'infinity';  // 'infinity' means 'show entire output' (not Infinity cuz that isn't JSON-serializable)
  // pinning?
  // output?
}

export const programFactory: ProgramFactory<Program> = (defaultInput) => {
  return {
    toolName: 'notebook',
    cells: [
      {
        var_: newVar(alphaLabels[0]),
        program: slotSetTo(defaultInput || ''),
        outputManualHeight: undefined,
      }
    ],
    prevVar: newVar('prev')
  };
}

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const [toolSet, outputs, views] = useToolSet();

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

  return <>{cells.map((cell) =>
    <CellModel
      key={cell.var_.id}
      id={cell.var_.id}
      cells={cells}
      updateCells={updateCells}
      varBindings={varBindings}
      outputs={outputs}
      toolSet={toolSet}
      prevVar={program.prevVar}
    />
  )}</>;
})

type ViewProps = ToolProps<Program> & {
  outputs: {[id: string]: ToolOutput | null},
  views: {[id: string]: ToolView | null},
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, views, outputs } = props;

  const [outputBelowInput, updateOutputBelowInput] = useAt(program, updateProgram, 'outputBelowInput');
  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const smallestUnusedLabel = unusedLabel(alphaLabels, cells.map(cell => cell.var_.label)) || 'ZZZ';

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

  const cellUpdaters = useMemo(() => atIndices(updateCells, cells.length), [cells.length, updateCells]);
  const cellRemovers = useMemo(() => removers(updateCells, cells.length), [cells.length, updateCells]);

  return (
    <div className="NotebookTool xPadH10" onContextMenu={openMenu}>
      { menuNode }
      <div className="xChildrenMinWidth0"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 20, rowGap: 10
        }}>
        {cells.map((cell, i) =>
          <Fragment key={cell.var_.id}>
            <RowDivider i={i} updateCells={updateCells} smallestUnusedLabel={smallestUnusedLabel} prevVar={program.prevVar}/>
            <CellView cell={cell}
              updateCell={cellUpdaters[i]}
              removeCell={cellRemovers[i]}
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
        program: slotSetTo(i === 0 ? '' : prevVar.id),
        outputManualHeight: undefined,
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

  varBindings: VarBindings,

  outputs: {[id: string]: ToolOutput | null};

  toolSet: ToolSet;

  prevVar: Var;
}

const CellModel = memo(function CellModel(props: CellModelProps) {
  const { id, cells, updateCells, varBindings, outputs, toolSet, prevVar } = props;

  const i = useMemo(() => {
    const i = cells.findIndex((cell) => cell.var_.id === id);
    if (i === -1) {
      throw new Error("internal error: cell not found");
    }
    return i;
  }, [cells, id]);

  const [cell, updateCell] = useAtIndex(cells, updateCells, i);
  const [cellProgram, updateCellProgram] = useAt(cell, updateCell, 'program');

  let prevOutput: ToolOutput | null | undefined = undefined;
  let prevLabel: string | undefined = undefined;
  const prevCell: Cell | undefined = cells[i - 1];
  if (prevCell) {
    prevOutput = outputs[prevCell.var_.id];
    prevLabel = prevCell.var_.label;
  }
  const prevVarContext = useMemo(() => {
    if (prevOutput && prevLabel) {
      const labelledPrevVar: Var = {
        ...prevVar,
        label: `↑ <i>${prevLabel}</i>`,
        autoCompleteLabel: '↑ prev'
      };
      const prevVarBinding = {
        var_: labelledPrevVar,
        output: prevOutput,
      };
      return {[prevVar.id]: prevVarBinding};
    } else {
      return undefined;
    }
  }, [prevLabel, prevOutput, prevVar])

  const newVarBindings = useDedupe(useMemo(() => {
    let result: {[label: string]: VarBinding} = {...varBindings, ...prevVarContext};
    cells.forEach((otherCell, cellIdx) => {
      if (cellIdx < i) {
        result[otherCell.var_.id] = {var_: otherCell.var_, output: outputs[otherCell.var_.id] || undefined};  // OH NO will this infinity?
      }
    });
    return result;
  }, [cells, i, outputs, prevVarContext, varBindings]), objEqWith(objEqWith(refEq)))

  // TODO: exclude things that are already present? or does this happen elsewhere


  return <ToolInSet toolSet={toolSet} keyInSet={id} program={cellProgram} updateProgram={updateCellProgram} varBindings={newVarBindings} />;
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
      <MyContextMenuHeading>Notebook Cell</MyContextMenuHeading>
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

  const [toolRef, toolSize] = useSize();

  const [outputRef, isOutputHovered] = useHover()

  const outputMaxHeight: number | undefined = (() => {
    // TODO: draggable height
    if (cell.outputManualHeight === 'infinity') {
      return undefined; // no limit
    }
    return Math.max(cell.outputManualHeight || 0, toolSize?.height || 0, 50);
  })();

  return <>
    {menuNode}
    <div className="NotebookTool-CellView-cell-cell" onContextMenu={openMenu}>
      <div className="xRow xStickyTop10" style={{marginTop: 4}}>
        <div className="xExpand"/>
        <VarDefinition var_={var_} updateVar={updateVar}/>
      </div>
    </div>
    <div className="NotebookTool-CellView-tool-cell xCol" style={{...(alreadyDisplayed || outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
      <div className="xStickyTop10" ref={toolRef}>
        <ShowView view={toolView}/>
      </div>
    </div>
    { !alreadyDisplayed &&
      <div className="NotebookTool-CellView-output-cell" style={{...(outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
        <div className="NotebookTool-CellView-output-cell-sticky xStickyTop10" ref={outputRef}>
          {/* TODO: clean this up */}
          { outputBelowInput
            ? <ToolOutputView toolOutput={toolOutput}/>
            : <>
                <ScrollShadow innerStyle={{overflow: 'auto', ...outputMaxHeight !== undefined && {maxHeight: outputMaxHeight}}}>
                  <ToolOutputView toolOutput={toolOutput}/>
                </ScrollShadow>
                { isOutputHovered &&
                  <div
                    style={{position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', pointerEvents: 'none'}}
                  >
                    <div
                      style={{position: 'sticky', bottom: 5, width: 15, height: 15, fontSize: 15, cursor: 'pointer', textAlign: 'right', margin: 5, userSelect: 'none', pointerEvents: 'initial'}}
                      onClick={() => updateCell(updateF({outputManualHeight: (old) => old === 'infinity' ? undefined : 'infinity'}))}
                    >
                      {cell.outputManualHeight === 'infinity' ? '⊖' : '⊕'}
                    </div>
                  </div>
                }
              </>
          }
        </div>
      </div>
    }
  </>
});
