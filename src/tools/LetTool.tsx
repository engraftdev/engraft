import { useCallback, useEffect } from "react"
import { newVarConfig, ProvideVar, registerTool, ToolConfig, toolIndex, ToolProps, VarConfig } from "../tools-framework/tools"
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool"
import ControlledTextInput from "../util/ControlledTextInput";
import { at, updateKeys, Updater, useAt } from "../util/state"
import { VarDefinition } from "../view/Vars";

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingVar: VarConfig;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export function LetTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const [bindingComponent, bindingView, bindingOutput] = useSubTool({config, updateConfig, subKey: 'bindingConfig'});
  const [bodyComponent, bodyView, bodyOutput] = useSubTool({config, updateConfig, subKey: 'bodyConfig'});

  useEffect(() => {
    reportOutput(bodyOutput);
  }, [bodyOutput, reportOutput])

  const [bindingVar, updateBindingVar] = useAt(config, updateConfig, 'bindingVar');

  const render = useCallback(({autoFocus}) => {
    return (
      <div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>let</b>
          {<VarDefinition varConfig={bindingVar} updateVarConfig={updateBindingVar} autoFocus={autoFocus}/>}
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
  }, [bindingVar, bindingView, bodyView, updateBindingVar]);
  useView(reportView, render, config);

  return <>
    {bindingComponent}
    {config.bindingVar ?
      <ProvideVar config={config.bindingVar} value={bindingOutput || undefined}>
        {bodyComponent}
      </ProvideVar> :
      bodyComponent
    }
  </>
}
registerTool<LetConfig>(LetTool, () => ({
  toolName: 'let',
  bindingVar: newVarConfig(),
  bindingConfig: toolIndex['code'].defaultConfig(),
  bodyConfig: toolIndex['code'].defaultConfig(),
}));
