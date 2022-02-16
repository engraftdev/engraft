import { useEffect } from "react";
import { setKeys } from "../util/setKeys";
import { registerTool, ToolProps } from "../tools-framework/tools";


export interface DumbTextConfig {
  toolName: 'dumb-text';
  text: string;
}
export function DumbTextTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<DumbTextConfig>) {
  useEffect(() => {
    reportOutput.set({toolValue: config.text});
  }, [config.text, reportOutput]);

  useEffect(() => {
    reportView.set(function View() {
      useEffect(() => {
        console.log("DumbTextTool mounted");

        return () => console.log("DumbTextTool unmounted");
      }, [])
      return (
        <input type="text" value={config.text} onChange={(ev) => reportConfig.update(setKeys({text: ev.target.value}))}/>
      );
    })
  }, [config.text, reportConfig, reportView])

  return null;
}
registerTool(DumbTextTool, {
  toolName: 'dumb-text',
  text: '',
});
