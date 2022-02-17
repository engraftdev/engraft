import { useEffect } from "react";
import { registerTool, ToolProps } from "../tools-framework/tools";
import { updateKeys } from "../util/state";


export interface DumbTextConfig {
  toolName: 'dumb-text';
  text: string;
}
export function DumbTextTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<DumbTextConfig>) {
  useEffect(() => {
    reportOutput({toolValue: config.text});
  }, [config.text, reportOutput]);

  useEffect(() => {
    reportView(function View() {
      useEffect(() => {
        console.log("DumbTextTool mounted");

        return () => console.log("DumbTextTool unmounted");
      }, [])
      return (
        <input type="text" value={config.text} onChange={(ev) => updateKeys(updateConfig, {text: ev.target.value})}/>
      );
    })
  }, [config.text, reportView, updateConfig])

  return null;
}
registerTool(DumbTextTool, {
  toolName: 'dumb-text',
  text: '',
});
