import { ToolConfig, ToolProps, ToolValue, ToolViewProps } from "../tools-framework/tools";
import { useSubTool, useTool } from "../tools-framework/useSubTool";
import { updateKeys, Updater } from "../util/state";

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


export function NotebookTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<NotebookConfig>) {
  // k we gotta make a large & variable number of subtools
}


interface CellProps {
  cell: Cell;
  updateCell: Updater<Cell>;
  toolMakeView: (props: ToolViewProps) => JSX.Element | null,
  toolOutput: ToolValue | null,
}

function Cell({cell, updateCell, toolMakeView}: CellProps) {
  return <div>
    <input type='text' value={cell.label} onChange={(e) => updateKeys(updateCell, {label: e.target.value})}/>
    {toolMakeView({})}
  </div>
}