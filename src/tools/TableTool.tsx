import { memo, useCallback } from "react";
import { TableInspector } from "react-inspector";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { useMemoObject } from "../util/useMemoObject";


export interface TableConfig {
  toolName: 'table';
  inputConfig: ToolConfig;
}
export const TableTool = memo(function TableTool({ config, updateConfig, reportOutput, reportView }: ToolProps<TableConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})
  const inputOutputWithAlreadyDisplayed = useMemoObject({toolValue: inputOutput?.toolValue, alreadyDisplayed: true});
  useOutput(reportOutput, inputOutputWithAlreadyDisplayed);

  const render = useCallback(function R({autoFocus}) {
    return <div style={{padding: 10}}>
      <ShowView view={inputView} autoFocus={autoFocus}/>
      <TableInspector data={inputOutput?.toolValue}/>
    </div>;
  }, [inputOutput, inputView]);
  useView(reportView, render, config);

  return inputComponent;
});
registerTool<TableConfig>(TableTool, 'table', () => ({
  toolName: 'table',
  inputConfig: toolIndex['code'].defaultConfig()
}));
