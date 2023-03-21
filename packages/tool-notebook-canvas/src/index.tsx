import { startDrag } from "@engraft/original/lib/util/drag.js";
import { unusedLabel } from "@engraft/original/lib/util/unusedLabel.js";
import { useContextMenu } from "@engraft/original/lib/util/useContextMenu.js";
import { MyContextMenu, MyContextMenuHeading } from "@engraft/original/lib/view/MyContextMenu.js";
import { ToolOutputView } from "@engraft/original/lib/view/Value.js";
import { VarDefinition } from "@engraft/original/lib/view/Vars.js";
import { cellNetwork, cellNetworkReferences, ComputeReferences, defineTool, EngraftPromise, hookIncr, hookMemo, hooks, memoizeProps, newVar, ProgramFactory, ShowView, slotWithCode, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, UpdateProxy, updateWithUP, useUpdateProxy, Var } from "@engraft/toolkit";
import _ from "lodash";
import { memo, useCallback, useMemo } from "react";
import { PaneGeo, roundTo } from "./noodle-canvas/model.js";
import { NoodleCanvas } from "./noodle-canvas/NoodleCanvas.js";


export type Program = {
  toolName: 'notebook-canvas',
  cells: Cell[],
  prevVar: Var,
  width: number,
  height: number,
}

type Cell = {
  var_: Var,
  program: ToolProgram,
  geo: PaneGeo,
  showOutputOnly: boolean,
}

const programFactory: ProgramFactory<Program> = (defaultInput) => ({
  toolName: 'notebook-canvas',
  cells: [
    {
      var_: newVar(defaultCellLabels[0]),
      program: slotWithCode(defaultInput),
      geo: {
        x: 16 * 3,
        y: 16 * 2,
        width: 16 * 16,
        height: 16 * 12,
      },
      showOutputOnly: false,
    }
  ],
  prevVar: newVar('prev'),
  width: 16 * 24,
  height: 16 * 20,
});

const defaultCellLabels = _.range(1, 1000).map((n) => `cell ${n}`);

const computeReferences: ComputeReferences<Program> = (program) =>
  cellNetworkReferences(program.cells);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const { cells } = program;

  const cellResults = hookIncr(cellNetwork, { cells, varBindings });

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

export default defineTool({ programFactory, computeReferences, run })

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  cellResults: {[id: string]: ToolResult},
}) => {
  const { program, updateProgram, cellResults } = props;
  const programUP = useUpdateProxy(updateProgram);
  const { cells } = program;

  const smallestUnusedLabel = unusedLabel(defaultCellLabels, cells.map(cell => cell.var_.label));

  const updatePaneGeoById = useCallback((id: string, f: (old: PaneGeo) => PaneGeo): void => {
    programUP.cells.$((oldCells) => {
      const idx = oldCells.findIndex((cell) => cell.var_.id === id);
      if (idx !== -1) {
        return updateWithUP(oldCells, (up) => up[idx].geo.$(f));
      } else {
        throw new Error("cannot find cell with id " + id);
      }
    })
  }, [programUP.cells])

  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      return {startWidth: program.width, startHeight: program.height};
    },
    move({startWidth, startHeight}) {
      const newWidth = roundTo(startWidth + this.event.clientX - this.startEvent.clientX, 16);
      const newHeight = roundTo(startHeight + this.event.clientY - this.startEvent.clientY, 16);
      programUP.width.$set(newWidth);
      programUP.height.$set(newHeight);
    },
    done() {},
    keepCursor: true,
  }), [program.width, program.height, programUP.width, programUP.height]);

  const onClickNewCell = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    programUP.cells.$(oldCells => {
      const newCell = {
        var_: newVar(smallestUnusedLabel),
        program: slotWithCode(''),
        geo: {
          x: 16 * 3,
          y: 16 * 2,
          width: 16 * 16,
          height: 16 * 12,
        },
        showOutputOnly: false,
      };
      return [...oldCells, newCell];
    });
  }, [programUP.cells, smallestUnusedLabel]);

  return (
    <div
      className="NotebookCanvasTool"
      style={{position: 'relative', width: program.width + 1, height: program.height + 1, overflow: 'hidden'}}
    >
      <NoodleCanvas
        panes={cells.map((cell, i) => ({
          id: cell.var_.id,
          geo: cell.geo,
          children: ({onMouseDownDragPane}) =>
            <CellView
              idx={i}
              cell={cell}
              cellsUP={programUP.cells}
              cellResult={cellResults[cell.var_.id]}
              onMouseDownDragPane={onMouseDownDragPane}
            />,
          transparent: cell.showOutputOnly,
        }))}
        updatePaneGeoById={updatePaneGeoById}
        minWidth={16 * 6}
        minHeight={16 * 4}
      />
      <div
        style={{position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize'}}
        onMouseDown={onMouseDownResizer}
      />
      <button
        style={{position: 'absolute', top: 10, left: 10, width: 30, height: 30, border: 'none', borderRadius: '50%', backgroundColor: '#ddd', cursor: 'pointer'}}
        onClick={onClickNewCell}
      >
        +
      </button>
    </div>
  );
})

type CellViewProps = {
  idx: number;

  cell: Cell;
  cellsUP: UpdateProxy<Cell[]>,

  cellResult: ToolResult,

  onMouseDownDragPane: (startEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {idx, cell, cellsUP, cellResult, onMouseDownDragPane} = props;
  const cellUP = cellsUP[idx];

  const removeCell = useCallback(() => {
    cellUP.$remove();
  } , [cellUP]);

  const makeCellOutput = useCallback(() => {
    cellUP.$remove();
    cellsUP.$helper({$push: [cell]});
  } , [cellUP, cellsUP, cell]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Canvas Cell</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            makeCellOutput();
            closeMenu();
          }}
        >
          Make output
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            removeCell();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>
      <div>
        <input
          type="checkbox"
          checked={cell.showOutputOnly}
          onChange={(ev) => cellUP.showOutputOnly.$set(ev.target.checked)}
        />
        Show output only
      </div>
    </MyContextMenu>
  , [cell.showOutputOnly, makeCellOutput, removeCell, cellUP.showOutputOnly]));

  if (cell.showOutputOnly) {
    return <div className="NotebookCanvasTool-CellView xCol" onContextMenu={openMenu} onMouseDown={onMouseDownDragPane} style={{height: '100%'}}>
      {menuNode}
      <ToolOutputView outputP={cellResult.outputP} displayReactElementsDirectly={true}/>
    </div>;
  }

  return <div className="NotebookCanvasTool-CellView xCol" onContextMenu={openMenu} style={{height: '100%'}}>
    {menuNode}
    <div
      className="PaneView-heading"
      style={{
        height: '2rem',
        backgroundColor: 'rgb(240, 240, 240)',
        borderRadius: '0.25rem 0.25rem 0 0',
        cursor: 'grab',
        flexShrink: 0,
      }}
      onMouseDown={onMouseDownDragPane}
    >
      <div
        className="NotebookCanvasTool-CellView-heading"
        style={{
          height: '100%',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{ display: 'inline-block', cursor: 'initial', alignSelf: 'flex-end' }}
          onMouseDown={(ev) => ev.stopPropagation()}
        >
          <VarDefinition var_={cell.var_} updateVar={cellUP.var_.$} attach='down' />
        </div>
        <div style={{flexGrow: 1}}/>
        <div style={{color: "#aaa"}}>
          {idx === 0 && "★"}
        </div>
      </div>
    </div>

    <div className="NotebookCanvasTool-CellView-tool xCol" style={{background: 'rgb(251, 251, 251)', minHeight: 0}}>
      <ShowView view={cellResult.view} updateProgram={cellUP.program.$} expand={true}/>
    </div>
    { !cellResult.view.showsOwnOutput &&
      <div className="NotebookCanvasTool-CellView-output" style={{padding: 5, overflow: 'scroll', minHeight: 6, flexShrink: 1000000}}>
        <ToolOutputView outputP={cellResult.outputP}/>
      </div>
    }
  </div>
});
