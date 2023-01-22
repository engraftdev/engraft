import { Fragment, memo, useCallback, useMemo, useRef } from "react";
import { mergeRefs } from "react-merge-refs";
import { ComputeReferences, newVar, ProgramFactory, references, ToolOutput, ToolProgram, ToolProps, ToolResult, Var, VarBindings } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { usePromiseState } from "src/engraft/EngraftPromise.react";
import { hookRunTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/mento/hookMemo";
import { hookFork, hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { startDrag } from "src/util/drag";
import { atIndices, removers, Updater } from "src/util/immutable";
import { hookAt, hookUpdateAtIndex } from "src/util/immutable-mento";
import { useAt } from "src/util/immutable-react";
import { difference, intersection, union } from "src/util/sets";
import { toposort } from "src/util/toposort";
import { alphaLabels, unusedLabel } from "src/util/unusedLabel";
import { updateF } from "src/util/updateF";
import { Use } from "src/util/Use";
import { MenuMaker, useContextMenu } from "src/util/useContextMenu";
import useHover from "src/util/useHover";
import useSize from "src/util/useSize";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import ScrollShadow from "src/view/ScrollShadow";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "../slot";


export type Program = {
  toolName: 'notebook',
  cells: Cell[],
  prevVar: Var,
  outputBelowInput?: boolean,
}

type Cell = {
  var_: Var,
  program: ToolProgram,
  outputManualHeight: number | undefined | 'infinity',  // 'infinity' means 'show entire output' (not Infinity cuz that isn't JSON-serializable)
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

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(
    union(...Object.values(program.cells).map(cell => references(cell.program))),
    union(Object.keys(program.cells), [program.prevVar.id])
  );


export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings } = props;

  const [cells, updateCells] = hookAt(program, updateProgram, 'cells');

  const cellIds = hookMemo(() => new Set(cells.map(cell => cell.var_.id)), [cells]);
  const interCellReferences = hookMemo(() =>
    hookFork((branch) =>
      Object.fromEntries(cells.map((cell) => branch(cell.var_.id, () => {
        return hookMemo(() => {
          return [cell.var_.id, intersection(references(cell.program), cellIds)] as const;
        }, [cell]);
      })))
    )
  , [cells]);
  const { cyclic } = hookMemo(() => {
    return toposort([...cellIds], interCellReferences);
  }, [cells, interCellReferences, cellIds]);

  // TODO: For now, we'll just wire all cells up to all cells, without any special accounting for
  // topological order. This is probably very inefficient.
  const cellOutputVarBindings = hookMemo(() =>
    Object.fromEntries(cells.map((cell) => [cell.var_.id, {var_: cell.var_, outputP: EngraftPromise.unresolved<ToolOutput>()}] as const))
  , [cells]);

  const allVarBindings: VarBindings = hookMemo(() => ({
    ...varBindings,
    ...cellOutputVarBindings,
  }), [varBindings, cellOutputVarBindings]);

  const cellResults = hookMemo(() =>
    hookFork((branch) =>
      cells.map((cell, i) => branch(cell.var_.id, () => {
        return hookMemo(() => {
          const updateCell = hookUpdateAtIndex(updateCells, i);
          const [cellProgram, updateCellProgram] = hookAt(cell, updateCell, 'program');

          const cellVarBindings = i === 0 ? allVarBindings : {
            ...allVarBindings,
            [program.prevVar.id]: {
              var_: program.prevVar,
              outputP: cellOutputVarBindings[cells[i - 1].var_.id].outputP,
            }
          };

          const { outputP, view } = hookRunTool({
            program: cellProgram,
            updateProgram: updateCellProgram,
            varBindings: cellVarBindings,
          });
          // TODO: inelegance because synchronous-promise isn't good at resolving with promises
          outputP.then(cellOutputVarBindings[cell.var_.id].outputP.resolve, cellOutputVarBindings[cell.var_.id].outputP.reject);
          return {
            outputP: cyclic.has(cell.var_.id)
              ? EngraftPromise.reject<ToolOutput>(new Error("cyclic"))
              : outputP,
            view,
          }
        }, [cell, updateCells, varBindings, cyclic, i]);
      }))
    )
  , [cells, updateCells, varBindings, cyclic, cellOutputVarBindings, allVarBindings]);

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    const lastCellResult = cellResults[cellResults.length - 1] as ToolResult | undefined;
    if (!lastCellResult) {
      throw new Error("no cells");
    }
    return lastCellResult.outputP;
  }), [cellResults]);

  const view = hookMemo(() => ({
    render: () => <View {...props} cellResults={cellResults} />,
    showsOwnOutput: true,
  }), [props, cellResults]);

  return { outputP, view };
}));

type ViewProps = ToolProps<Program> & {
  cellResults: ToolResult[],
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, cellResults } = props;

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
              cellResult={cellResults[i]}
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

type RowDividerProps = {
  i: number,
  updateCells: Updater<Cell[]>,
  smallestUnusedLabel: string,
  prevVar: Var,
}

const RowDivider = memo(function RowDivider({i, updateCells, smallestUnusedLabel, prevVar}: RowDividerProps) {
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

type CellViewProps = {
  cell: Cell,
  updateCell: Updater<Cell>,

  cellResult: ToolResult,

  removeCell: () => void,

  notebookMenuMaker: MenuMaker,

  outputBelowInput: boolean,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, updateCell, cellResult, removeCell, notebookMenuMaker, outputBelowInput} = props;
  const [var_, updateVar] = useAt(cell, updateCell, 'var_');
  const cellOutputState = usePromiseState(cellResult.outputP);
  const cellShowsOwnOutput = cellResult.view.showsOwnOutput;

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

  const [outputHoverRef, isOutputHovered] = useHover()
  const outputRef = useRef<HTMLDivElement>(null);

  const outputMaxHeight: number | undefined = (() => {
    // TODO: draggable height
    if (cell.outputManualHeight === 'infinity') {
      return undefined; // no limit
    }
    return Math.max(cell.outputManualHeight || 0, toolSize?.height || 0, 50);
  })();

  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      return {startHeight: outputRef.current!.clientHeight};
    },
    move({startHeight}) {
      const newHeight = startHeight + this.event.clientY - this.startEvent.clientY;
      updateCell(updateF({ outputManualHeight: {$set: newHeight} }));
    },
    done() {},
    keepCursor: true,
  }), [updateCell]);

  return <>
    {menuNode}
    <div className="NotebookTool-CellView-cell-cell" onContextMenu={openMenu}>
      <div className="xRow xStickyTop10" style={{marginTop: 4}}>
        <div className="xExpand"/>
        <VarDefinition var_={var_} updateVar={updateVar}/>
      </div>
    </div>
    <div className="NotebookTool-CellView-tool-cell xCol" style={{...(cellShowsOwnOutput || outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
      <div className="xStickyTop10" ref={toolRef}>
        <ShowView view={cellResult.view}/>
      </div>
    </div>
    { !cellShowsOwnOutput &&
      <div className="NotebookTool-CellView-output-cell" style={{...(outputBelowInput ? {gridColumn: '2 / 4'} : {})}} onContextMenu={openMenu}>
        <div className="NotebookTool-CellView-output-cell-sticky xStickyTop10" ref={mergeRefs([outputRef, outputHoverRef])}>
          {/* TODO: clean this up */}
          { outputBelowInput
            ? <ToolOutputView outputState={cellOutputState}/>
            : <>
                <ScrollShadow innerStyle={{overflow: 'auto', ...outputMaxHeight !== undefined && {maxHeight: outputMaxHeight}}}>
                  <ToolOutputView outputState={cellOutputState}/>
                </ScrollShadow>
                { isOutputHovered &&
                  <div
                    style={{position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', pointerEvents: 'none'}}
                  >
                    <div
                      className="xRow xAlignRight"
                      style={{
                        position: 'sticky',
                        bottom: 5,
                        width: '100%',
                        height: 15,
                        fontSize: 15,
                        margin: 5,
                        userSelect: 'none',
                      }}
                    >
                      <div
                        onClick={() => updateCell(updateF({outputManualHeight: (old) => old === 'infinity' ? undefined : 'infinity'}))}
                        style={{
                          cursor: 'pointer',
                          pointerEvents: 'initial'
                        }}
                      >
                        {cell.outputManualHeight === 'infinity' ? '⊖' : '⊕'}
                      </div>
                      <div
                        onMouseDown={onMouseDownResizer}
                        style={{
                          cursor: 'ns-resize',
                          pointerEvents: 'initial'
                        }}
                      >
                        ↕
                      </div>
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
