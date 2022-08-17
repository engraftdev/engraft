import _ from "lodash";
import { memo, useCallback, useEffect, useMemo } from "react";
import { EnvContext, hasValue, newVar, PossibleEnvContext, PossibleVarBinding, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, Var, VarBinding } from "src/tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "src/tools-framework/useSubTool";
import { AddObjToContext } from "src/util/context";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "src/util/state";
import { Use } from "src/util/Use";
import { useContextMenu } from "src/util/useContextMenu";
import { objEqWith, refEq, useDedupe } from "src/util/useDedupe";
import useHover from "src/util/useHover";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import { Pane, PaneGeo } from "src/view/noodle-canvas/model";
import { NoodleCanvas } from "src/view/noodle-canvas/NoodleCanvas";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { codeProgramSetTo } from "./code";
import update from "immutability-helper";


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
  upstreamIds: {[id: string]: true},
  geo: PaneGeo,
}

export const programFactory: ProgramFactory<Program> = (defaultInput) => {
  return {
    toolName: 'notebook-canvas',
    cells: [
      {
        var_: newVar(defaultCellLabels[0]),
        program: codeProgramSetTo(defaultInput || ''),
        upstreamIds: {},
        geo: {
          x: 16,
          y: 16,
          width: 16 * 16,
          height: 16 * 12,
        },
      }
    ],
    prevVar: newVar('prev'),
    width: 120 * 3,
    height: 120 * 2,
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

  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const smallestUnusedLabel = defaultCellLabels.find((label) =>
    !cells.find((cell) => cell.var_.label === label)
  )!

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

  return (
    <div className="NotebookTool xPad10" style={{width: program.width, height: program.height}}>
      <NoodleCanvas
        panes={cells.map((cell, i) => ({
          id: cell.var_.id,
          geo: cell.geo,
          heading:
            <VarDefinition
              var_={cell.var_}
              updateVar={at(atIndex<Cell>(updateCells, i), 'var_')}
            />,
          children:
            <CellView cell={cell}
              // TODO: memoize these?
              updateCell={atIndex(updateCells, i)}
              removeCell={() => {
                const newCells = [...cells];
                newCells.splice(i, 1);
                updateCells(() => newCells);
              }}
              toolOutput={outputs[cell.var_.id]} toolView={views[cell.var_.id]}
            />,
        }))}
        updatePaneGeoById={updatePaneGeoById}
        minWidth={16 * 12}
        minHeight={16 * 4}
      />
      <div style={{position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: 'blue'}} />
    </div>
  );
})

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


  return <AddObjToContext context={EnvContext} obj={newVarBindings}>
    <AddObjToContext context={PossibleEnvContext} obj={newPossibleVarBindings}>
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
}

const CellView = memo(function CellView(props: CellViewProps) {
  const {cell, updateCell, toolView, toolOutput, removeCell} = props;

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
    </MyContextMenu>
  , [removeCell]));

  return <>
    {menuNode}
    <div className="NotebookTool-CellView-tool-cell xCol" onContextMenu={openMenu}>
      <ShowView view={toolView} expand={true}/>
    </div>
    { !alreadyDisplayed &&
      <div className="NotebookTool-CellView-output-cell" onContextMenu={openMenu} style={{padding: 5}}>
        <ToolOutputView toolValue={toolOutput}/>
      </div>
    }
  </>
});
