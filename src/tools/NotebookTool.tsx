import { useCallback, useEffect, useMemo } from "react";
import { EnvContext, newVarConfig, PossibleEnvContext, PossibleVarInfo, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, VarConfig, VarInfo } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";

import { AddObjToContext } from "../util/context";
import useDebounce, { objEqWith, refEq } from "../util/useDebounce";
import { VarDefinition } from "../view/Vars";
import Value from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";
import useHover from "../util/useHover";

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


export function NotebookTool({ config, updateConfig, reportOutput, reportView }: ToolProps<NotebookConfig>) {
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

  const render = useCallback(() => {
    return <div style={{padding: 10, display: 'grid', gridTemplateColumns: 'fit-content(400px) minmax(0, 1fr) minmax(60px, 1fr)', columnGap: 20, rowGap: 20}}>
      {cells.map((cell, i) =>
        <>
          <RowDivider i={i} updateCells={updateCells}/>
          <CellView key={cell.var.id} cell={cell}
            // TODO: memoize these?
            updateCell={atIndex(updateCells, i)}
            removeCell={() => {
              const newCells = [...cells];
              newCells.splice(i, 1);
              updateCells(() => newCells);
            }}
            toolOutput={outputs[cell.var.id]} toolView={views[cell.var.id]}
          />
        </>
      )}
      <RowDivider i={cells.length} updateCells={updateCells}/>
    </div>;
  }, [cells, outputs, updateCells, views])
  useView(reportView, render, config);

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
}
registerTool(NotebookTool, {
  toolName: 'notebook',
  cells: []
});


function RowDivider({i, updateCells}: {i: number, updateCells: Updater<Cell[]>}) {
  const onClick = useCallback(() => {
    updateCells((oldCells) => {
      let newCells = oldCells.slice();
      newCells.splice(i, 0, {var: newVarConfig(''), config: codeConfigSetTo(''), upstreamIds: {}});
      return newCells;
    })
  }, [i, updateCells]);

  const [hoverRef, isHovered] = useHover<HTMLDivElement>();

  return <div ref={hoverRef} style={{gridColumn: '1/4', height: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer'}} onClick={onClick}>
    <div style={{borderTop: `1px ${isHovered ? 'solid' : 'dashed'} rgba(0,0,0,0.2)`, height: 1, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      {isHovered && <div style={{background: 'white', color: 'rgba(0,0,0,0.4)', position: 'relative', top: -3, pointerEvents: 'none'}}>insert row</div>}
    </div>
  </div>;
}


interface CellModelProps {
  id: string;

  cells: Cell[];
  updateCells: Updater<Cell[]>;

  outputs: {[id: string]: ToolValue | null};

  reportView: (id: string, view: ToolView | null) => void;
  reportOutput: (id: string, value: ToolValue | null) => void;
}

function CellModel({id, cells, updateCells, outputs, reportView, reportOutput}: CellModelProps) {
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
}




interface CellViewProps {
  cell: Cell;
  updateCell: Updater<Cell>;

  toolOutput: ToolValue | null,
  toolView: ToolView | null,

  removeCell: () => void;
}

function CellView({cell, updateCell, toolView, toolOutput, removeCell}: CellViewProps) {
  const outputDisplay = useMemo(() => {
    if (!toolOutput) {
      return <div style={{fontSize: 13, fontStyle: 'italic'}}>no output</div>;
    }
    try {
      return <Value value={toolOutput.toolValue}/>;
    } catch {
      return '[cannot serialize]';
    }
  }, [toolOutput])

  const [varConfig, updateVarConfig] = useAt(cell, updateCell, 'var');

  return <>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 150, width: 150}}>
      <VarDefinition varConfig={varConfig} updateVarConfig={updateVarConfig}/>
      <pre style={{fontSize: '70%', fontStyle: 'italic'}}>{varConfig.id}</pre>
      <pre style={{fontSize: '7px', fontStyle: 'italic'}}>depends on: {Object.keys(cell.upstreamIds).join(", ")}</pre>
      <button style={{borderRadius: 30, zoom: "60%"}} onClick={removeCell}>✖️</button>
    </div>
    <div className="notebook-CellView-right" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, maxWidth: '100%'}}>
      <div style={{maxWidth: '100%', marginBottom: 10, position: 'sticky', top: 10}}>
        <ShowView view={toolView}/>
      </div>
    </div>
    <div style={{marginBottom: 10, maxWidth: '100%'}}>
      <div style={{position: 'sticky', top: 10}}>
        {outputDisplay}
      </div>
    </div>
  </>
}