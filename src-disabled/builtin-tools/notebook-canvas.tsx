import update from "immutability-helper";
import _ from "lodash";
import React, { memo, useCallback, useMemo } from "react";
import { ComputeReferences, hasValue, newVar, ProgramFactory, references, ToolOutput, ToolProgram, ToolProps, ToolView, Var, VarBinding, VarBindings } from "src/tools-framework/tools";
import { ShowView, ToolInSet, ToolSet, useOutput, useToolSet, useView } from "src/tools-framework/useSubTool";
import { startDrag } from "src/util/drag";
import { difference, union } from "src/util/sets";
import { atIndex, Updater, useAt, useAtIndex } from "src/util/state";
import { unusedLabel } from "src/util/unusedLabel";
import { updateF } from "src/util/updateF";
import { useContextMenu } from "src/util/useContextMenu";
import { objEqWith, refEq, useDedupe } from "src/util/useDedupe";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import { PaneGeo, roundTo } from "src/view/noodle-canvas/model";
import { NoodleCanvas } from "src/view/noodle-canvas/NoodleCanvas";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";


export type Program = {
  toolName: 'notebook-canvas';
  cells: Cell[];
  prevVar: Var;
  width: number;
  height: number;
}

type Cell = {
  var_: Var,  // empty label if unlabelled, natch
  program: ToolProgram,
  geo: PaneGeo,
  showOutputOnly: boolean,
}

export const programFactory: ProgramFactory<Program> = (defaultInput) => {
  return {
    toolName: 'notebook-canvas',
    cells: [
      {
        var_: newVar(defaultCellLabels[0]),
        program: slotSetTo(defaultInput || ''),
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
  };
}

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(
    union(...Object.values(program.cells).map(cell => references(cell.program))),
    Object.keys(program.cells)
  );

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const [toolSet, outputs, views] = useToolSet();

  useView(reportView, useMemo(() => ({
    render: () => <View {...props} outputs={outputs} views={views} />
  }), [outputs, props, views]));

  useOutput(reportOutput, useMemo(() => {
    const firstCell = cells[0] as Cell | null;
    if (!firstCell) {
      return null;
    }
    return outputs[firstCell.var_.id];
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

const defaultCellLabels = _.range(1, 1000).map((n) => `cell ${n}`);


type ViewProps = ToolProps<Program> & {
  outputs: {[id: string]: ToolOutput | null},
  views: {[id: string]: ToolView | null},
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, views, outputs } = props;

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const smallestUnusedLabel = unusedLabel(defaultCellLabels, cells.map(cell => cell.var_.label));

  const updatePaneGeoById = useCallback((id: string, f: (old: PaneGeo) => PaneGeo): void => {
    updateCells((oldCells) => {
      const idx = oldCells.findIndex((cell) => cell.var_.id === id);
      if (idx !== -1) {
        return update(oldCells, { [idx]: { geo: f } });
      } else {
        throw new Error("cannot find cell with id " + id);
      }
    })
  }, [updateCells])

  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      return {startWidth: program.width, startHeight: program.height};
    },
    move({startWidth, startHeight}) {
      const newWidth = roundTo(startWidth + this.event.clientX - this.startEvent.clientX, 16);
      const newHeight = roundTo(startHeight + this.event.clientY - this.startEvent.clientY, 16);
      updateProgram(updateF({ width: {$set: newWidth}, height: {$set: newHeight} }));
    },
    done() {},
    keepCursor: true,
  }), [program.width, program.height, updateProgram]);

  const onClickNewCell = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateCells((oldCells) => {
      const newCell = {
        var_: newVar(smallestUnusedLabel),
        program: slotSetTo(''),
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
  }, [smallestUnusedLabel, updateCells]);

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
              updateCells={updateCells}
              toolOutput={outputs[cell.var_.id]} toolView={views[cell.var_.id]}
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
  const { id, cells, updateCells, varBindings, outputs, toolSet } = props;

  const i = useMemo(() => {
    const i = cells.findIndex((cell) => cell.var_.id === id);
    if (i === -1) {
      throw new Error("internal error: cell not found");
    }
    return i;
  }, [cells, id]);

  const [cell, updateCell] = useAtIndex(cells, updateCells, i);
  const [cellProgram, updateCellProgram] = useAt(cell, updateCell, 'program');

  const newVarBindings = useDedupe(useMemo(() => {
    let result: {[label: string]: VarBinding} = {...varBindings};
    cells.forEach((otherCell) => {
      if (otherCell.var_.id !== cell.var_.id) {
        const output = outputs[otherCell.var_.id] as ToolOutput | null | undefined;
        result[otherCell.var_.id] = {var_: otherCell.var_, output: output || null};  // OH NO will this infinity?
      }
    });
    return result;
  }, [cell.var_.id, cells, outputs, varBindings]), objEqWith(objEqWith(refEq)))

  // TODO: exclude things that are already present? or does this happen elsewhere

  return <ToolInSet toolSet={toolSet} keyInSet={id} program={cellProgram} updateProgram={updateCellProgram} varBindings={newVarBindings} />;
});




interface CellViewProps {
  idx: number;

  cell: Cell;
  updateCells: Updater<Cell[]>;

  toolOutput: ToolOutput | null,
  toolView: ToolView | null,

  onMouseDownDragPane: (startEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {idx, cell, updateCells, toolView, toolOutput, onMouseDownDragPane} = props;

  const updateCell = useMemo(() => atIndex(updateCells, idx), [idx, updateCells]);

  const removeCell = useCallback(() => {
    updateCells((oldCells) => {
      const newCells = [...oldCells];
      newCells.splice(idx, 1);
      return newCells;
    });
  } , [updateCells, idx]);

  const makeCellOutput = useCallback(() => {
    updateCells((oldCells) => {
      const newCells = [...oldCells];
      newCells.splice(idx, 1);
      newCells.splice(0, 0, oldCells[idx]);
      return newCells;
    });
  } , [updateCells, idx]);


  const [var_, updateVar] = useAt(cell, updateCell, 'var_');
  const [showOutputOnly, updateShowOutputOnly] = useAt(cell, updateCell, 'showOutputOnly');

  const alreadyDisplayed = hasValue(toolOutput) && toolOutput.alreadyDisplayed;

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
        <input type="checkbox" checked={showOutputOnly} onChange={(ev) => updateShowOutputOnly(() => ev.target.checked)}/> Show output only
      </div>
    </MyContextMenu>
  , [showOutputOnly, makeCellOutput, removeCell, updateShowOutputOnly]));

  if (showOutputOnly) {
    return <div className="NotebookCanvasTool-CellView xCol" onContextMenu={openMenu} onMouseDown={onMouseDownDragPane} style={{height: '100%'}}>
      {menuNode}
      <ToolOutputView toolOutput={toolOutput} displayReactElementsDirectly={true}/>
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
          style={{display: 'inline-block', cursor: 'initial'}}
          onMouseDown={(ev) => ev.stopPropagation()}
        >
          <VarDefinition var_={var_} updateVar={updateVar} />
        </div>
        <div style={{flexGrow: 1}}/>
        <div style={{color: "#aaa"}}>
          {idx === 0 && "★"}
        </div>
      </div>
    </div>

    <div className="NotebookCanvasTool-CellView-tool xCol" style={{background: 'rgb(251, 251, 251)', minHeight: 0}}>
      <ShowView view={toolView} expand={true}/>
    </div>
    { !alreadyDisplayed &&
      <div className="NotebookCanvasTool-CellView-output" style={{padding: 5, overflow: 'scroll', minHeight: 6, flexShrink: 1000000}}>
        <ToolOutputView toolOutput={toolOutput}/>
      </div>
    }
  </div>
});