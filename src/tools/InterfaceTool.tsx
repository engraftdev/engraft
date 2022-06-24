import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { newId } from "../util/id";
import { RowToCol } from "../util/RowToCol";
import { useAt } from "../util/state";
import useHover from "../util/useHover";
import { useKeyHeld } from "../util/useKeyHeld";
import { ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";


export interface InterfaceConfig extends ToolConfig {
  toolName: 'interface';
  inputConfig: ToolConfig;
}

export const InterfaceTool = memo(function InterfaceTool(props: ToolProps<InterfaceConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  useOutput(reportOutput, {toolValue: {view: null, values: null}, alreadyDisplayed: true})

  const view: ToolView = useCallback((viewProps) => (
    <InterfaceToolView {...props} {...viewProps} inputView={inputView} inputOutput={inputOutput}/>
  ), [props, inputView, inputOutput]);
  useView(reportView, view);

  return <>
    {inputComponent}
  </>
});
registerTool<InterfaceConfig>(InterfaceTool, 'interface', (defaultInput) => {
  return {
    toolName: 'interface',
    inputConfig: codeConfigSetTo(defaultInput || ''),
  };
});


interface InterfaceToolViewProps extends ToolProps<InterfaceConfig>, ToolViewProps {
  inputView: ToolView | null;
  inputOutput: ToolValue | null;
}

const InterfaceToolView = memo(function InterfaceToolView(props: InterfaceToolViewProps) {
  const { config, updateConfig, autoFocus, inputView, inputOutput } = props;

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>input</b>
        <ShowView view={inputView} />
      </div>
    </div>
  );
})
