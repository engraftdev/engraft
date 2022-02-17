import { useCallback, useEffect, useMemo } from "react"
import { AddToEnvContext, registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools"
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool"
import { updateKeys } from "../util/state"

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingKey: string;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export function LetTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const [bindingComponent, bindingView, bindingOutput] = useSubTool({config, updateConfig, subKey: 'bindingConfig'})

  const newBindingForBody = useMemo(() => {
    return bindingOutput ? {[config.bindingKey]: bindingOutput} : {}
  }, [bindingOutput, config.bindingKey])

  const [bodyComponent, bodyView, bodyOutput] = useSubTool({config, updateConfig, subKey: 'bodyConfig'})

  useEffect(() => {
    reportOutput(bodyOutput);
  }, [bodyOutput, reportOutput])

  const render = useCallback(() => {
    return (
      <div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>let</b>
          <input type="text" autoFocus={true} value={config.bindingKey} onChange={(ev) => updateKeys(updateConfig, {bindingKey: ev.target.value})}/>
        </div>

        <div className="row-top" style={{marginBottom: 10}}>
          <b>be</b>
          <ShowView view={bindingView} />
        </div>

        <div className="row-top" style={{marginBottom: 10}}>
          <b>in</b>
          <ShowView view={bodyView} />
        </div>
      </div>
    );
  }, [bindingView, bodyView, config.bindingKey, updateConfig]);
  useView(reportView, render, config);

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
