import { ComputeReferences, EngraftPromise, hookRunTool, newVar, ProgramFactory, references, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, Var, VarBindings } from "@engraft/core";
import { hookDedupe, hookFork, hookMemo, hooks, hookSharedIncr, memoizeForever, memoizeProps } from "@engraft/incr";
import { arrEqWithRefEq, objEqWith, objEqWithRefEq, recordEqWith, setEqWithRefEq } from "@engraft/shared/src/eq";
import _ from "lodash";
import { Fragment, memo, useCallback, useMemo, useRef } from "react";
import { startDrag } from "../../util/drag";
import { Updater } from "../../util/immutable";
import { useStateSetOnly } from "../../util/immutable-react";
import { mergeRefs } from "../../util/mergeRefs";
import { difference, intersection, union } from "@engraft/shared/src/sets";
import { toposort } from "../../util/toposort";
import { alphaLabels, unusedLabel } from "../../util/unusedLabel";
import { UpdateProxyRemovable } from "@engraft/update-proxy";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { Use } from "../../util/Use";
import { MenuMaker, useContextMenu } from "../../util/useContextMenu";
import useHover from "../../util/useHover";
import useSize from "../../util/useSize";
import { MyContextMenu, MyContextMenuHeading } from "../../view/MyContextMenu";
import ScrollShadow from "../../view/ScrollShadow";
import { ToolOutputView } from "../../view/Value";
import { VarDefinition } from "../../view/Vars";


export type Program = {
  toolName: 'notebook',
  cells: Cell[],
  prevVar: Var,
  outputBelowInput?: boolean,
}

type Cell = {
  var_: Var,
  program: ToolProgram,
  outputManualHeight: number | undefined | 'infinity',
    // 'infinity' means 'show entire output' (not Infinity cuz that isn't JSON-serializable)
}

export const programFactory: ProgramFactory<Program> = (defaultInput) => {
  return {
    toolName: 'notebook',
    cells: [
      {
        var_: newVar(alphaLabels[0]),
        program: slotWithCode(defaultInput || ''),
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
  const { program, varBindings } = props;
  const { cells } = program;

  const cellIds = hookMemo(() =>
    new Set(cells.map(cell => cell.var_.id)
  ), [cells]);
  const interCellReferencesByCell = hookDedupe(hookMemo(() =>
    hookFork((branch) =>
      Object.fromEntries(cells.map((cell) => branch(cell.var_.id, () => {
        return hookMemo(() => {
          return [cell.var_.id, intersection(references(cell.program), cellIds)] as const;
        }, [cell]);
      })))
    )
  , [cells]), objEqWith(setEqWithRefEq));
  const { sorted, cyclic } = hookDedupe(hookMemo(() => {
    return toposort([...cellIds], interCellReferencesByCell);
  }, [cells, interCellReferencesByCell, cellIds]), recordEqWith({sorted: arrEqWithRefEq, cyclic: setEqWithRefEq<string>}));

  // Make a little placeholder for every cell which will be used when a cell doesn't refer to it yet
  // TODO: this is kinda a "possibleVarBindings" thing; idk how it should really work.

  const makePlaceholder = hookSharedIncr(memoizeForever((var_: Var) => {
    return {var_, outputP: EngraftPromise.reject<ToolOutput>(new Error("just a placeholder"))};
  }));

  const cellOutputPlaceholderVarBindings: VarBindings = hookMemo(() =>
    Object.fromEntries(cells.map(cell => [cell.var_.id, makePlaceholder(cell.var_)])
  ), [cells]);

  // hookLogChanges({cellIds, interCellReferencesByCell, sorted, cyclic, cellOutputPlaceholderVarBindings}, 'notebook');

  const cellResults = hookMemo(() => {
    // The plan: Loop through cells in sorted order. Build up a set of output promises.
    let cellResults: {[cellId: string]: ToolResult} = {};

    hookFork((branch) => {
      sorted.forEach((cellId) => branch(cellId, () => {
        // The bindings for this cell will consist of:
        //  * varBindings (into the notebook from above)
        //  * actual output var bindings (for references)
        //  * placeholder output var bindings (for other cells)
        //  * `prev`

        // TODO: oh, one reason for a "possibleVarBindings" thing is to prevent churn when
        // irrelevant vars change... or should that be a tool's responsibility, hookRelevantVars
        // style? except tools still need to pass down possibleVarBindings to their children, right?
        // idk man.

        const i = cells.findIndex(cell => cell.var_.id === cellId);
        const cell = cells[i];
        const interCellReferences = interCellReferencesByCell[cellId];

        const actualVarBindings: VarBindings = hookDedupe(
          _.mapValues(_.pick(cellResults, [...interCellReferences]), ({outputP}, cellId) => ({var_: cells.find((cell) => cell.var_.id === cellId)!.var_, outputP}))
        , objEqWith(objEqWithRefEq));

        const placeholderVarBindings: VarBindings = hookDedupe(hookMemo(() =>
          _.omit(cellOutputPlaceholderVarBindings, [...interCellReferences])
        , [cellOutputPlaceholderVarBindings, interCellReferences]), objEqWithRefEq);

        const prevVarBindings: VarBindings = hookDedupe((() => {
          if (i === 0) { return {}; }
          const prevCell = cells[i - 1];

          return {
            [program.prevVar.id]: {
              var_: program.prevVar,
              outputP: references(cell.program).has(program.prevVar.id)
                ? cellResults[prevCell.var_.id].outputP
                : cellOutputPlaceholderVarBindings[prevCell.var_.id].outputP,
            }
          }
        })(), objEqWith(objEqWithRefEq));

        const cellVarBindings = hookMemo(() => ({
          ...varBindings,
          ...actualVarBindings,
          ...placeholderVarBindings,
          ...prevVarBindings,
        }), [varBindings, actualVarBindings, placeholderVarBindings, prevVarBindings]);

        // hookLogChanges({actualVarBindings, placeholderVarBindings, prevVarBindings, cellVarBindings}, 'notebook ' + cellId)

        const { outputP, view } = hookRunTool({
          program: cell.program,
          varBindings: cellVarBindings,
        });

        cellResults[cellId] = {
          outputP: cyclic.has(cell.var_.id)
            ? EngraftPromise.reject(new Error("cyclic"))
            : outputP,
          view,
        }
      }));
    });

    return cellResults;
  }, [cells, varBindings, interCellReferencesByCell, cellOutputPlaceholderVarBindings, program.prevVar.id, sorted, cyclic]);

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    const lastCell = _.last(cells);
    const lastCellResult = lastCell && cellResults[lastCell.var_.id];
    if (!lastCellResult) {
      throw new Error("no cells");
    }
    return lastCellResult.outputP;
  }), [cellResults]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...renderProps} {...props} cellResults={cellResults} />,
    showsOwnOutput: cells.length > 0,
  }), [props, cellResults]);

  return { outputP, view };
}));

type ViewProps = ToolViewRenderProps<Program> & ToolProps<Program> & {
  cellResults: {[id: string]: ToolResult},
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, cellResults, autoFocus } = props;
  const programUP = useUpdateProxy(updateProgram);

  const smallestUnusedLabel = unusedLabel(alphaLabels, program.cells.map(cell => cell.var_.label)) || 'ZZZ';

  const notebookMenuMaker: MenuMaker = useCallback((closeMenu) => <>
    <MyContextMenuHeading>Notebook</MyContextMenuHeading>
    <div className="MenuItem">
      <input type="checkbox" checked={program.outputBelowInput} onChange={(ev) => programUP.outputBelowInput.$set(ev.target.checked)}/>
      Output below input
    </div>
  </>, [program.outputBelowInput, programUP.outputBelowInput]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      {notebookMenuMaker(closeMenu)}
    </MyContextMenu>
  , [notebookMenuMaker]));

  return (
    <div className="NotebookTool xPadH10" onContextMenu={openMenu}>
      { menuNode }
      <div className="xChildrenMinWidth0"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 20, rowGap: 10
        }}>
        {program.cells.map((cell, i) =>
          <Fragment key={cell.var_.id}>
            <CellDivider i={i} updateCells={programUP.cells.$apply} smallestUnusedLabel={smallestUnusedLabel} prevVar={program.prevVar}/>
            <CellView cell={cell} cellUP={programUP.cells[i]}
              cellResult={cellResults[cell.var_.id]}
              notebookMenuMaker={notebookMenuMaker}
              outputBelowInput={program.outputBelowInput || false}
              autoFocus={i === 0 && autoFocus}
            />
          </Fragment>
        )}
        <CellDivider i={program.cells.length} updateCells={programUP.cells.$apply} smallestUnusedLabel={smallestUnusedLabel} prevVar={program.prevVar}/>
      </div>
    </div>
  );
})

const CellDivider = memo((props: {
  i: number,
  updateCells: Updater<Cell[]>,
  smallestUnusedLabel: string,
  prevVar: Var,
}) => {
  const { i, updateCells, smallestUnusedLabel, prevVar } = props;

  const onClick = useCallback(() => {
    updateCells((oldCells) => {
      let newCells = oldCells.slice();
      newCells.splice(i, 0, {
        var_: newVar(smallestUnusedLabel),
        program: slotWithCode(i === 0 ? '' : prevVar.id),
        outputManualHeight: undefined,
      });
      return newCells;
    })
  }, [i, prevVar.id, smallestUnusedLabel, updateCells]);

  const [isFocused, setIsFocused] = useStateSetOnly(() => false);

  return <Use hook={useHover}>
    {([hoverRef, isHovered]) =>
      <div ref={hoverRef} className="xCol xAlignVCenter xClickable"
        style={{gridColumn: '1/4', height: 10}}
        onClick={onClick}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            onClick();
            ev.preventDefault();
            ev.stopPropagation();
          }
        }}
      >
        {(isHovered || isFocused) &&
          <div className="xCenter"
            style={{borderTop: `1px solid rgba(0,0,0,0.5)`, height: 0}}
          >
            <div style={{background: 'white', color: 'rgba(0,0,0,0.4)', position: 'relative', top: -3, pointerEvents: 'none'}}>
              new cell
            </div>
          </div>
        }
      </div>
    }
    </Use>;
});

type CellViewProps = {
  cell: Cell,
  cellUP: UpdateProxyRemovable<Cell>,

  cellResult: ToolResult,

  notebookMenuMaker: MenuMaker,

  outputBelowInput: boolean,

  autoFocus?: boolean,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, cellUP, cellResult, notebookMenuMaker, outputBelowInput, autoFocus} = props;

  const cellShowsOwnOutput = cellResult.view.showsOwnOutput;

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Notebook Cell</MyContextMenuHeading>
      <button
        onClick={() => {
          cellUP.$remove();
          closeMenu();
        }}
      >
        Delete
      </button>
      {notebookMenuMaker(closeMenu)}
    </MyContextMenu>
  , [cellUP, notebookMenuMaker]));

  const [toolRef, toolSize] = useSize();
  const [outputContentRef, outputContentSize] = useSize();

  const [outputHoverRef, isOutputHovered] = useHover()
  const outputOuterRef = useRef<HTMLDivElement>(null);

  const outputMaxHeight: number | undefined = (() => {
    // TODO: draggable height
    if (cell.outputManualHeight === 'infinity') {
      return undefined; // no limit
    }
    return Math.max(cell.outputManualHeight || 0, toolSize?.height || 0, 50);
  })();

  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      return {startHeight: outputOuterRef.current!.clientHeight};
    },
    move({startHeight}) {
      const newHeight = startHeight + this.event.clientY - this.startEvent.clientY;
      cellUP.outputManualHeight.$set(newHeight);
    },
    done() {},
    keepCursor: true,
  }), [cellUP.outputManualHeight]);

  return <>
    {menuNode}
    <div className="NotebookTool-CellView-cell-cell" onContextMenu={openMenu}>
      <div className="xRow xStickyTop10" style={{marginTop: 4}}>
        <div className="xExpand"/>
        <VarDefinition var_={cell.var_} updateVar={cellUP.var_.$apply}/>
      </div>
    </div>
    <div
      className="NotebookTool-CellView-tool-cell xCol"
      style={{...(cellShowsOwnOutput || outputBelowInput ? {gridColumn: '2 / 4'} : {})}}
      onContextMenu={openMenu}
    >
      <div className="xStickyTop10" ref={toolRef}>
        <ShowView view={cellResult.view} updateProgram={cellUP.program.$apply} autoFocus={autoFocus}/>
      </div>
    </div>
    { !cellShowsOwnOutput &&
      <div
        className="NotebookTool-CellView-output-cell"
        style={{...(outputBelowInput ? {gridColumn: '2 / 4'} : {})}}
        onContextMenu={openMenu}
      >
        <div className="NotebookTool-CellView-output-cell-sticky xStickyTop10" ref={mergeRefs([outputHoverRef])}>
          {/* TODO: clean this up */}
          { outputBelowInput
            ? <ToolOutputView outputP={cellResult.outputP}/>
            : <>
                <ToolOutputView
                  outputP={cellResult.outputP}
                  valueWrapper={(view) =>
                    <div style={{position: 'relative'}} ref={outputOuterRef}>
                      <ScrollShadow
                        innerStyle={{overflow: 'auto', ...outputMaxHeight !== undefined && {maxHeight: outputMaxHeight}}}
                        contentRef={outputContentRef}
                      >
                        {view}
                      </ScrollShadow>
                      { isOutputHovered && outputContentSize && toolSize && outputContentSize.height > toolSize.height &&
                        <div
                          style={{
                            position: 'absolute',
                            left: 0, top: 0,
                            height: '100%', width: '100%',
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end',
                            pointerEvents: 'none'
                          }}
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
                              ...outputMaxHeight && outputMaxHeight < outputContentSize.height && {
                                marginRight: 15,  // shift over to make room for scroll-bar
                              },
                              userSelect: 'none',
                            }}
                          >
                            <div
                              onClick={() => cellUP.outputManualHeight.$apply((old) => old === 'infinity' ? undefined : 'infinity')}
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
                    </div>
                  }
                />
              </>
          }
        </div>
      </div>
    }
  </>
});
