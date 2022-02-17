import { useEffect, useMemo } from "react"
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools"
import { useSubTool } from "../tools-framework/useSubTool"
import { updateKeys } from "../util/state"

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingKey: string;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export function LetTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const [bindingComponent, bindingMakeView, bindingOutput] = useSubTool({context, config, updateConfig, subKey: 'bindingConfig'})

  const contextForBody = useMemo(() => {
    return bindingOutput ? {...context, [config.bindingKey]: bindingOutput} : context
  }, [bindingOutput, config.bindingKey, context])

  const [bodyComponent, bodyMakeView, bodyOutput] = useSubTool({context: contextForBody, config, updateConfig, subKey: 'bodyConfig'})

  useEffect(() => {
    reportOutput(bodyOutput);
  }, [bodyOutput, reportOutput])

  useEffect(() => {
    reportView(() => {
      return (
        <div>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>let</b>
            <input type="text" autoFocus={true} value={config.bindingKey} onChange={(ev) => updateKeys(updateConfig, {bindingKey: ev.target.value})}/>
          </div>

          <div className="row-top" style={{marginBottom: 10}}>
            <b>be</b>
            {bindingMakeView({})}
          </div>

          <div className="row-top" style={{marginBottom: 10}}>
            <b>in</b>
            {bodyMakeView({})}
          </div>
        </div>
      );
    });
    return () => reportView(null);
  }, [config.bindingKey, reportView, updateConfig, bindingMakeView, bodyMakeView]);

  return <>
    {bindingComponent}
    {bodyComponent}
  </>
}
registerTool(LetTool, {
  toolName: 'let',
  bindingKey: 'x',
  bindingConfig: toolIndex['code'].defaultConfig,
  bodyConfig: toolIndex['code'].defaultConfig
});
