import { ComputeReferences, EngraftPromise, newVar, ProgramFactory, randomId, ShowViewWithNewScopeVarBindings, slotWithCode, ToolProgram, ToolProps, ToolResultWithNewScopeVarBindings, ToolView, ToolViewRenderProps, Var } from "@engraft/core";
import { hookMemo, hookRefunction, hooks, memoizeProps } from "@engraft/refunc";
import { cellNetwork, cellNetworkReferences, outputBackgroundStyle } from "@engraft/toolkit";
import { UpdateProxyRemovable } from "@engraft/update-proxy";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import _ from "lodash";
import { Fragment, memo, useCallback, useMemo, useRef } from "react";
import { startDrag } from "../../util/drag.js";
import { useStateSetOnly } from "../../util/immutable-react.js";
import { Updater } from "../../util/immutable.js";
import { mergeRefs } from "../../util/mergeRefs.js";
import { alphaLabels, unusedLabel } from "../../util/unusedLabel.js";
import { Use } from "../../util/Use.js";
import { MenuMaker, useContextMenu } from "../../util/useContextMenu.js";
import useHover from "../../util/useHover.js";
import useSize from "../../util/useSize.js";
import { MyContextMenu, MyContextMenuHeading } from "../../view/MyContextMenu.js";
import ScrollShadow from "../../view/ScrollShadow.js";
import { ToolOutputView } from "../../view/Value.js";
import { VarDefinition } from "../../view/Vars.js";


export type Program = {
  toolName: 'notebook',
  cells: Cell[],
  prevVarId: string,
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
    prevVarId: randomId(),
  };
}

export const computeReferences: ComputeReferences<Program> = (program) =>
  cellNetworkReferences(program.cells, program.prevVarId);

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const { cells, prevVarId } = program;

  const cellResults = hookRefunction(cellNetwork, { cells, varBindings, prevVarId });

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    const lastCell = _.last(cells);
    const lastCellResult = lastCell && cellResults[lastCell.var_.id];
    if (!lastCellResult) {
      throw new Error("no cells");
    }
    return lastCellResult.outputP;
  }), [cellResults, cells]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...renderProps} {...props} cellResults={cellResults} />,
    showsOwnOutput: cells.length > 0,
  }), [cells.length, props, cellResults]);

  return { outputP, view };
}));

type ViewProps = ToolViewRenderProps<Program> & ToolProps<Program> & {
  cellResults: {[id: string]: ToolResultWithNewScopeVarBindings},
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

  const [setOutputSizeElem, outputSize] = useSize();

  return (
    <div className="NotebookTool xPadH10" onContextMenu={openMenu}>
      { menuNode }
      {outputSize &&
        <div
          className="output-background"
          style={{
            position: 'absolute',
            top: 0, bottom: 0, right: 0, width: outputSize.width + 20,
            ...outputBackgroundStyle,
            // zIndex: -1,
          }}
        />
      }
      <div className="xChildrenMinWidth0"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, auto)'
        }}>
        {!program.outputBelowInput &&
          <div
            ref={setOutputSizeElem}
            className="output-size"
            style={{
              gridColumn: '3 / 4',
              height: 0,
            }}
          />
        }
        {program.cells.map((cell, i) =>
          <Fragment key={cell.var_.id}>
            <CellDivider i={i} updateCells={programUP.cells.$apply} smallestUnusedLabel={smallestUnusedLabel} prevVarId={program.prevVarId} outputBelowInput={program.outputBelowInput} />
            <CellView cell={cell} cellUP={programUP.cells[i]}
              cellResult={cellResults[cell.var_.id]}
              notebookMenuMaker={notebookMenuMaker}
              outputBelowInput={program.outputBelowInput || false}
              autoFocus={i === 0 && autoFocus}
            />
          </Fragment>
        )}
        <CellDivider i={program.cells.length} updateCells={programUP.cells.$apply} smallestUnusedLabel={smallestUnusedLabel} prevVarId={program.prevVarId} outputBelowInput={program.outputBelowInput} />
      </div>
    </div>
  );
})

const CellDivider = memo((props: {
  i: number,
  updateCells: Updater<Cell[]>,
  smallestUnusedLabel: string,
  prevVarId: string,
  outputBelowInput?: boolean,
}) => {
  const { i, updateCells, smallestUnusedLabel, prevVarId, outputBelowInput } = props;

  const onClick = useCallback((ev: React.MouseEvent | undefined) => {
    updateCells((oldCells) => {
      let newCells = oldCells.slice();
      newCells.splice(i, 0, {
        var_: newVar(smallestUnusedLabel),
        program: slotWithCode(i === 0 ? '' : prevVarId),
        outputManualHeight: undefined,
      });
      return newCells;
    });
    // TODO: not working to stop the click from focusing the divider
    ev?.preventDefault();
  }, [i, prevVarId, smallestUnusedLabel, updateCells]);

  const [isFocused, setIsFocused] = useStateSetOnly(() => false);

  return <Use hook={useHover}>
    {([hoverRef, isHovered]) => <>
      <div ref={hoverRef} className="xCol xAlignVCenter xClickable"
        style={{gridColumn: outputBelowInput ? '1/4' : '1/3', height: 20}}
        onClick={onClick}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            onClick(undefined);
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
      { !outputBelowInput &&
          // spacer (who has time to learn CSS grid?)
          <div/>
      }
    </>}
    </Use>;
});

type CellViewProps = {
  cell: Cell,
  cellUP: UpdateProxyRemovable<Cell>,

  cellResult: ToolResultWithNewScopeVarBindings,

  notebookMenuMaker: MenuMaker,

  outputBelowInput: boolean,

  autoFocus?: boolean,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, cellUP, cellResult, notebookMenuMaker, outputBelowInput, autoFocus} = props;

  const cellShowsOwnOutput = cellResult.viewWithNewScopeVarBinding.view.showsOwnOutput;

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
      <div className="xRow xStickyTop10">
        <div className="xExpand"/>
        <VarDefinition var_={cell.var_} updateVar={cellUP.var_.$apply} attach='right' style={{marginTop: 4}} />
      </div>
    </div>
    <div
      className="NotebookTool-CellView-tool-cell xCol"
      style={
        cellShowsOwnOutput || outputBelowInput
        ? { gridColumn: '2 / 4' }
        : { marginRight: 20 }}
      onContextMenu={openMenu}
    >
      <div className="xStickyTop10" ref={toolRef}>
        <ShowViewWithNewScopeVarBindings
          {...cellResult.viewWithNewScopeVarBinding}
          updateProgram={cellUP.program.$apply}
          autoFocus={autoFocus}
        />
      </div>
    </div>
    { !cellShowsOwnOutput &&
      <div
        className="NotebookTool-CellView-output-cell"
        style={{
          // Even if output is on the right and we already have a
          // background-color column, include outputBackgroundStyle on output
          // divs to get the shadow color right.
          ...outputBackgroundStyle,
          ...(
            outputBelowInput
            ? {
              gridColumn: '2 / 4',
              padding: 10,
            }
            : {}
          )
        }}
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
