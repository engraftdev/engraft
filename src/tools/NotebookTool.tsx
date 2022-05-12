import _ from "lodash";
import { Fragment, memo, useCallback, useEffect, useMemo } from "react";
import { EnvContext, newVarConfig, PossibleEnvContext, PossibleVarInfo, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, VarConfig, VarInfo } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { AddObjToContext } from "../util/context";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";
import { Use } from "../util/Use";
import useDebounce, { objEqWith, refEq } from "../util/useDebounce";
import useHover from "../util/useHover";
import { ValueOfTool } from "../view/Value";
import { VarDefinition } from "../view/Vars";
import { codeConfigSetTo } from "./CodeTool";


export interface NotebookConfig extends ToolConfig {
  toolName: 'notebook';
  cells: Cell[];
}

interface Cell {
  var: VarConfig;  // empty label if unlabelled, natch
  config: ToolConfig;
  upstreamIds: {[id: string]: true};
  // pinning?
  // output?
}

const defaultCellLabels = _.range(1, 1000).map((n) => `cell ${n}`);

export const NotebookTool = memo(function NotebookTool({ config, updateConfig, reportOutput, reportView }: ToolProps<NotebookConfig>) {
  const [cells, updateCells] = useAt(config, updateConfig, 'cells');

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const reportCellView = useCallback((id: string, view: ToolView | null) => {
    // console.log("reportCellView", id);
    updateKeys(updateViews, {[id]: view})
  }, [updateViews])
  const reportCellOutput = useCallback((id: string, output: ToolValue | null) => {
    // console.log("reportCellOutput", id);
    updateKeys(updateOutputs, {[id]: output})
  }, [updateOutputs])

  const smallestUnusedLabel = defaultCellLabels.find((label) =>
    !cells.find((cell) => cell.var.label === label)
  )!

  const view: ToolView = useCallback(() => (
    <div className="NotebookTool xPad10 xChildrenMinWidth0"
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 20, rowGap: 10
      }}>
      {cells.map((cell, i) =>
        <Fragment key={cell.var.id}>
          <RowDivider i={i} updateCells={updateCells} smallestUnusedLabel={smallestUnusedLabel}/>
          <CellView cell={cell}
            // TODO: memoize these?
            updateCell={atIndex(updateCells, i)}
            removeCell={() => {
              const newCells = [...cells];
              newCells.splice(i, 1);
              updateCells(() => newCells);
            }}
            toolOutput={outputs[cell.var.id]} toolView={views[cell.var.id]}
          />
        </Fragment>
      )}
      <RowDivider i={cells.length} updateCells={updateCells} smallestUnusedLabel={smallestUnusedLabel}/>
    </div>
  ), [cells, outputs, smallestUnusedLabel, updateCells, views])
  useView(reportView, view);

  const output = useMemo(() => {
    const lastCell = cells[cells.length - 1] as Cell | null;
    if (!lastCell) {
      return null;
    }

    return outputs[lastCell.var.id];
  }, [cells, outputs])
  useOutput(reportOutput, output);

  // const newBindings = useMemo(() => {
  //   return {};
  // }, []);

  return <>{cells.map((cell) =>
    <CellModel
      key={cell.var.id}
      id={cell.var.id}
      cells={cells}
      updateCells={updateCells}
      outputs={outputs}
      reportView={reportCellView} reportOutput={reportCellOutput}/>
  )}</>;
})
registerTool<NotebookConfig>(NotebookTool, 'notebook', () => ({
  toolName: 'notebook',
  cells: [
    { var: newVarConfig(defaultCellLabels[0]), config: codeConfigSetTo(''), upstreamIds: {} }
  ]
}));

export function notebookConfigSetTo(config: ToolConfig): NotebookConfig {
  return {
    toolName: 'notebook',
    cells: [
      { var: newVarConfig(defaultCellLabels[0]), config: codeConfigSetTo(config), upstreamIds: {} }
    ]
  };
}


const RowDivider = memo(function RowDivider({i, updateCells, smallestUnusedLabel}: {i: number, updateCells: Updater<Cell[]>, smallestUnusedLabel: string}) {
  const onClick = useCallback(() => {
    updateCells((oldCells) => {
      let newCells = oldCells.slice();
      newCells.splice(i, 0, {var: newVarConfig(smallestUnusedLabel), config: codeConfigSetTo(''), upstreamIds: {}});
      return newCells;
    })
  }, [i, smallestUnusedLabel, updateCells]);

  // const [hoverRef, isHovered] = useHover();

  return <Use hook={useHover}>
    {([hoverRef, isHovered]) =>
      <div ref={hoverRef} className="xCol xAlignVCenter xClickable"
        style={{gridColumn: '1/4', height: 10}}
        onClick={onClick}
      >
        <div className="xCenter"
          style={{borderTop: isHovered ? `1px solid rgba(0,0,0,0.5)` : '1px solid rgba(0,0,0,0.2)', height: 0}}
        >
          {isHovered &&
            <div style={{background: 'white', color: 'rgba(0,0,0,0.4)', position: 'relative', top: -3, pointerEvents: 'none'}}>
              insert row
            </div>
          }
        </div>
      </div>
    }
    </Use>;
});


interface CellModelProps {
  id: string;

  cells: Cell[];
  updateCells: Updater<Cell[]>;

  outputs: {[id: string]: ToolValue | null};

  reportView: (id: string, view: ToolView | null) => void;
  reportOutput: (id: string, value: ToolValue | null) => void;
}

const CellModel = memo(function CellModel({id, cells, updateCells, outputs, reportView, reportOutput}: CellModelProps) {
  const i = useMemo(() => {
    const i = cells.findIndex((cell) => cell.var.id === id);
    if (i === -1) {
      throw new Error("internal error: cell not found");
    }
    return i;
  }, [cells, id]);

  const [cell, updateCell] = useAtIndex(cells, updateCells, i);
  const [config, updateConfig] = useAt(cell, updateCell, 'config');

  const [component, view, output] = useTool({ config, updateConfig })

  useEffect(() => reportView(id, view), [id, reportView, view]);
  useEffect(() => reportOutput(id, output), [id, output, reportOutput]);


  const newVarInfos = useDebounce(useMemo(() => {
    let result: {[label: string]: VarInfo} = {};
    cells.forEach((otherCell) => {
      if (cell.upstreamIds[otherCell.var.id]) {
        result[otherCell.var.id] = {config: otherCell.var, value: outputs[otherCell.var.id] || undefined};  // OH NO will this infinity?
      }
    });
    return result;
  }, [cell.upstreamIds, cells, outputs]), objEqWith(objEqWith(refEq)))

  // TODO: exclude things that are already present? or does this happen elsewhere
  const newPossibleVarInfos = useDebounce(useMemo(() => {
    let result: {[label: string]: PossibleVarInfo} = {};
    cells.forEach((otherCell) => {
      if (otherCell !== cell && otherCell.var.label.length > 0) {
        result[otherCell.var.id] = {config: otherCell.var, request: () => updateKeys(at(updateCell, 'upstreamIds'), {[otherCell.var.id]: true})};
      }
    });
    return result;
  }, [cell, cells, updateCell]), objEqWith(objEqWith(refEq)))


  return <AddObjToContext context={EnvContext} obj={newVarInfos}>
    <AddObjToContext context={PossibleEnvContext} obj={newPossibleVarInfos}>
      {component}
    </AddObjToContext>
  </AddObjToContext>;
});




interface CellViewProps {
  cell: Cell;
  updateCell: Updater<Cell>;

  toolOutput: ToolValue | null,
  toolView: ToolView | null,

  removeCell: () => void;
}

const CellView = memo(function CellView({cell, updateCell, toolView, toolOutput, removeCell}: CellViewProps) {
  const [varConfig, updateVarConfig] = useAt(cell, updateCell, 'var');

  const alreadyDisplayed = toolOutput?.alreadyDisplayed;

  return <>
    <div className="NotebookTool-CellView-cell-cell">
      <div className="xRow xGap10 xStickyTop10">
        <div className="xExpand"/>
        <div className="xClickable" style={{zoom: "60%"}} onClick={removeCell}>✖️</div>
        <VarDefinition varConfig={varConfig} updateVarConfig={updateVarConfig}/>
        <div className="xLineHeight1">=</div>
      </div>
    </div>
    <div className="NotebookTool-CellView-tool-cell xCol xWidthFitContent" style={{...(alreadyDisplayed ? {gridColumn: '2 / 4'} : {})}}>
      <div className="xStickyTop10">
        <ShowView view={toolView}/>
      </div>
    </div>
    { !alreadyDisplayed &&
      <div className="NotebookTool-CellView-output-cell">
        <div className="xStickyTop10">
          <ValueOfTool toolValue={toolOutput}/>
        </div>
      </div>
    }
  </>
});
