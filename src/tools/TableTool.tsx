import { useCallback } from "react";
import { TableInspector } from "react-inspector";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";


export interface TableConfig {
  toolName: 'table';
  inputConfig: ToolConfig;
}
export function TableTool({ config, updateConfig, reportOutput, reportView }: ToolProps<TableConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})
  useOutput(reportOutput, inputOutput);

  const render = useCallback(function R({autoFocus}) {
    return <div>
      <ShowView view={inputView} autoFocus={autoFocus}/>
      <TableInspector data={inputOutput?.toolValue}/>
    </div>;
  }, [inputOutput, inputView]);
  useView(reportView, render, config);

  return inputComponent;
}
registerTool<TableConfig>(TableTool, () => ({
  toolName: 'table',
  inputConfig: toolIndex['code'].defaultConfig()
}));
