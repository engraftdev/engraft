import { useCallback, useEffect, useMemo } from "react";
import { registerTool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { atIndex, updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";

export interface NotebookConfig extends ToolConfig {
  toolName: 'notebook';
  cells: Cell[];
}

interface Cell {
  id: string;
  label: string;  // empty if unlabelled, natch
  config: ToolConfig;
  // pinning?
  // output?
}


export function NotebookTool({ config, updateConfig, reportOutput, reportView }: ToolProps<NotebookConfig>) {
  console.log("notebook config", config);
  const [cells, updateCells] = useAt(config, updateConfig, 'cells');

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const reportCellView = useCallback((id: string, view: ToolView | null) => {
    updateKeys(updateViews, {[id]: view})
  }, [updateViews])
  const reportCellOutput = useCallback((id: string, output: ToolValue | null) => {
    updateKeys(updateOutputs, {[id]: output})
  }, [updateOutputs])

  const render = useCallback(() => {
    return <div>
      {cells.map((cell, i) => <CellView key={cell.id} cell={cell} updateCell={atIndex(updateCells, i)} toolOutput={outputs[cell.id]} toolView={views[cell.id]} />)}
      <button onClick={() => updateCells((cells) => [...cells, {id: Math.random().toString(), label: '', config: toolIndex['code'].defaultConfig}])}>+</button>
    </div>;
  }, [cells, outputs, updateCells, views])
  useView(reportView, render, config);

  const output = useMemo(() => {
    const lastCell = cells[cells.length - 1] as Cell | null;
    if (!lastCell) {
      return null;
    }

    return outputs[lastCell.id];
  }, [cells, outputs])
  useOutput(reportOutput, output);

  return <>{cells.map((cell) =>
    <CellModel key={cell.id} id={cell.id} cells={cells} updateCells={updateCells} reportView={reportCellView} reportOutput={reportCellOutput}/>
  )}</>
}
registerTool(NotebookTool, {
  toolName: 'notebook',
  cells: []
});




interface CellModelProps {
  id: string;

  cells: Cell[];
  updateCells: Updater<Cell[]>;

  reportView: (id: string, view: ToolView | null) => void;
  reportOutput: (id: string, value: ToolValue | null) => void;
}

function CellModel({id, cells, updateCells, reportView, reportOutput}: CellModelProps) {
  const i = useMemo(() => {
    const i = cells.findIndex((cell) => cell.id === id);
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

  return component;
}




interface CellViewProps {
  cell: Cell;
  updateCell: Updater<Cell>;

  toolOutput: ToolValue | null,
  toolView: ToolView | null,
}

function CellView({cell, updateCell, toolView}: CellViewProps) {
  return <div>
    <input type='text' value={cell.label} onChange={(e) => updateKeys(updateCell, {label: e.target.value})}/>
    <ShowView view={toolView}/>
  </div>
}