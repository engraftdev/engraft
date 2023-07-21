import { startDrag } from "@engraft/shared/lib/drag.js";
import { alphaLabels, unusedLabel } from "@engraft/shared/lib/unusedLabel.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { Use } from "@engraft/shared/lib/Use.js";
import { MenuMaker, useContextMenu } from "@engraft/shared/lib/useContextMenu.js";
import { useHover } from "@engraft/shared/lib/useHover.js";
import { useSize } from "@engraft/shared/lib/useSize.js";
import { cellNetwork, cellNetworkReferences, ComputeReferences, defineTool, EngraftPromise, hookMemo, hookRefunction, hooks, memoizeProps, MyContextMenu, MyContextMenuHeading, newVar, outputBackgroundStyle, MakeProgram, randomId, ScrollShadow, ShowViewWithScope, slotWithCode, ToolOutputView, ToolProgram, ToolProps, ToolResultWithScope, ToolView, ToolViewRenderProps, UpdateProxyRemovable, useUpdateProxy, Var, VarDefinition } from "@engraft/toolkit";
import _ from "lodash";
import { Fragment, memo, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";


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

const makeProgram: MakeProgram<Program> = (defaultInput) => {
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

const computeReferences: ComputeReferences<Program> = (program) =>
  cellNetworkReferences(program.cells, program.prevVarId);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const { cells, prevVarId } = program;

  const cellResultsWithScope = hookRefunction(cellNetwork, { cells, varBindings, prevVarId });

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    const lastCell = _.last(cells);
    const lastCellResultWithScope = lastCell && cellResultsWithScope[lastCell.var_.id];
    if (!lastCellResultWithScope) {
      throw new Error("no cells");
    }
    return lastCellResultWithScope.result.outputP;
  }), [cellResultsWithScope, cells]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...renderProps} {...props} cellResultsWithScope={cellResultsWithScope} />,
    showsOwnOutput: cells.length > 0,
  }), [cells.length, props, cellResultsWithScope]);

  return { outputP, view };
}));

export default defineTool({makeProgram, computeReferences, run});

type ViewProps = ToolViewRenderProps<Program> & ToolProps<Program> & {
  cellResultsWithScope: {[id: string]: ToolResultWithScope},
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, cellResultsWithScope, autoFocus } = props;
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
              cellResultWithScope={cellResultsWithScope[cell.var_.id]}
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

  const [isFocused, setIsFocused] = useState(false);

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

  cellResultWithScope: ToolResultWithScope,

  notebookMenuMaker: MenuMaker,

  outputBelowInput: boolean,

  autoFocus?: boolean,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, cellUP, cellResultWithScope, notebookMenuMaker, outputBelowInput, autoFocus} = props;

  const cellShowsOwnOutput = cellResultWithScope.result.view.showsOwnOutput;

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

  const valueWrapper = useCallback((view: ReactNode) =>
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
    </div>,
    [cell.outputManualHeight, cellUP.outputManualHeight, isOutputHovered, onMouseDownResizer, outputContentRef, outputContentSize, outputMaxHeight, toolSize]
  );

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
        <ShowViewWithScope
          resultWithScope={cellResultWithScope}
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
            ? <ToolOutputView outputP={cellResultWithScope.result.outputP}/>
            : <ToolOutputView
                outputP={cellResultWithScope.result.outputP}
                valueWrapper={valueWrapper}
              />
          }
        </div>
      </div>
    }
  </>
});
