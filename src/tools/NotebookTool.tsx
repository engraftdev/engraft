import { useCallback, useEffect, useMemo } from "react";
import { EnvContext, newVarConfig, registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView, VarConfig, VarInfo } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { at, atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";

import { ObjectInspector } from "react-inspector";
import { AddObjToContext } from "../util/context";

export interface NotebookConfig extends ToolConfig {
  toolName: 'notebook';
  cells: Cell[];
}

interface Cell {
  var: VarConfig;  // empty label if unlabelled, natch
  config: ToolConfig;
  upstreamIds: string[];
  // pinning?
  // output?
}


export function NotebookTool({ config, updateConfig, reportOutput, reportView }: ToolProps<NotebookConfig>) {
  const [cells, updateCells] = useAt(config, updateConfig, 'cells');

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const reportCellView = useCallback((id: string, view: ToolView | null) => {
    console.log("reportCellView", id);
    updateKeys(updateViews, {[id]: view})
  }, [updateViews])
  const reportCellOutput = useCallback((id: string, output: ToolValue | null) => {
    console.log("reportCellOutput", id);
    updateKeys(updateOutputs, {[id]: output})
  }, [updateOutputs])

  const render = useCallback(() => {
    return <div>
      {cells.map((cell, i) => <CellView key={cell.var.id} cell={cell} updateCell={atIndex(updateCells, i)} toolOutput={outputs[cell.var.id]} toolView={views[cell.var.id]} />)}
      <button onClick={() =>
        updateCells((cells) => [...cells, {var: newVarConfig(''), config: toolIndex['code'].defaultConfig(), upstreamIds: []}])}>
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


  const newVarInfos = useMemo(() => {
    let newVarInfos: {[label: string]: VarInfo} = {};
    cell.upstreamIds.forEach((upstreamId) => {
      newVarInfos[upstreamId] = {config: cell.var, value: outputs[upstreamId] || undefined};
    });
    return newVarInfos;
  }, [cell.upstreamIds, cell.var, outputs])


  return <AddObjToContext context={EnvContext} obj={newVarInfos}>
    {component}
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
      return '[no output]';
    }
    try {
      return <ObjectInspector data={toolOutput.toolValue} />;
    } catch {
      return '[cannot serialize]';
    }
  }, [toolOutput])

  return <div style={{display: 'flex', alignItems: 'flex-start'}}>
    <input type='text' value={cell.var.label} onChange={(e) => updateKeys(at(updateCell, 'var'), {label: e.target.value})}
      style={{textAlign: 'right', border: 'none', width: 100}}/>
    <div style={{fontSize: 13, marginLeft: 10, marginRight: 10, visibility: cell.var.label.length > 0 ? 'visible' : 'hidden'}}>=</div>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
      {outputDisplay}
      <ShowView view={toolView}/>
    </div>
  </div>
}