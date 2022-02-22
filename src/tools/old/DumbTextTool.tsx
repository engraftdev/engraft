import { useCallback, useEffect } from "react";
import { registerTool, ToolProps } from "../../tools-framework/tools";
import { useOutput, useView } from "../../tools-framework/useSubTool";
import ControlledTextInput from "../../util/ControlledTextInput";
import { updateKeys } from "../../util/state";
import { useMemoObject } from "../../util/useMemoObject";


export interface DumbTextConfig {
  toolName: 'dumb-text';
  text: string;
}
export function DumbTextTool({ config, updateConfig, reportOutput, reportView }: ToolProps<DumbTextConfig>) {
  const output = useMemoObject({toolValue: config.text});
  useOutput(reportOutput, output);

  const render = useCallback(function R() {
    return (
      <ControlledTextInput value={config.text} onChange={(ev) => updateKeys(updateConfig, {text: ev.target.value})}/>
    );
  }, [config.text, updateConfig]);
  useView(reportView, render, config);

  return null;
}
registerTool(DumbTextTool, {
  toolName: 'dumb-text',
  text: '',
});
