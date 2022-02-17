import { useEffect, useMemo } from "react"
import { AddToEnvContext, registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools"
import { useSubTool } from "../tools-framework/useSubTool"
import { updateKeys } from "../util/state"

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingKey: string;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export function LetTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const [bindingComponent, bindingMakeView, bindingOutput] = useSubTool({config, updateConfig, subKey: 'bindingConfig'})

  const newBindingForBody = useMemo(() => {
    return bindingOutput ? {[config.bindingKey]: bindingOutput} : {}
  }, [bindingOutput, config.bindingKey])

  const [bodyComponent, bodyMakeView, bodyOutput] = useSubTool({config, updateConfig, subKey: 'bodyConfig'})

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
    <AddToEnvContext value={newBindingForBody}>
      {bodyComponent}
    </AddToEnvContext>
  </>
}
registerTool(LetTool, {
  toolName: 'let',
  bindingKey: 'x',
  bindingConfig: toolIndex['code'].defaultConfig,
  bodyConfig: toolIndex['code'].defaultConfig
});
