import { useCallback, useEffect, useMemo } from "react";
import { EnvContext, newVarConfig, PossibleEnvContext, PossibleVarInfo, registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView, VarConfig, VarInfo } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";

import { ObjectInspector } from "react-inspector";
import { AddObjToContext } from "../util/context";
import useDebounce, { arrEqWith, objEqWith, refEq } from "../util/useDebounce";
import ControlledTextInput from "../util/ControlledTextInput";
import { VarDefinition } from "../view/Vars";
import Value from "../view/Value";
import ScrollShadow from "react-scroll-shadow";

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
    return <div>
      {cells.map((cell, i) => <CellView key={cell.var.id} cell={cell} updateCell={atIndex(updateCells, i)} toolOutput={outputs[cell.var.id]} toolView={views[cell.var.id]} />)}
      <button onClick={() =>
        updateCells((cells) => [...cells, {var: newVarConfig(''), config: toolIndex['code'].defaultConfig(), upstreamIds: {}}])}>
          +
      </button>
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
}

function CellView({cell, updateCell, toolView, toolOutput}: CellViewProps) {
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

  return <div style={{display: 'flex', alignItems: 'flex-start', paddingBottom: 50}}>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 150, width: 150}}>
      <VarDefinition varConfig={varConfig} updateVarConfig={updateVarConfig}/>
      <pre style={{fontSize: '70%', fontStyle: 'italic'}}>{varConfig.id}</pre>
    </div>
    <div style={{fontSize: 13, marginLeft: 10, marginRight: 10, visibility: cell.var.label.length > 0 ? 'visible' : 'hidden'}}>=</div>
    <div className="notebook-CellView-right" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflowX: "hidden"}}>
      <div style={{marginBottom: 10, maxHeight: 200, overflow: 'scroll', maxWidth: '100%'}}>
        {outputDisplay}
      </div>
      <div style={{maxWidth: '100%'}}>
        <ShowView view={toolView}/>
      </div>
      <pre style={{fontSize: '70%', fontStyle: 'italic'}}>depends on: {Object.keys(cell.upstreamIds).join(", ")}</pre>
    </div>
  </div>
}