import { memo, useCallback, useEffect } from "react";
import { newVarConfig, ProvideVar, registerTool, ToolConfig, ToolProps, ToolView, VarConfig } from "../tools-framework/tools";
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { VarDefinition } from "../view/Vars";
import { codeConfigSetTo } from "./CodeTool";

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingVar: VarConfig;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export const LetTool = memo(function LetTool({ config, updateConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const [bindingComponent, bindingView, bindingOutput] = useSubTool({config, updateConfig, subKey: 'bindingConfig'});
  const [bodyComponent, bodyView, bodyOutput] = useSubTool({config, updateConfig, subKey: 'bodyConfig'});

  useEffect(() => {
    reportOutput(bodyOutput);
  }, [bodyOutput, reportOutput])

  const [bindingVar, updateBindingVar] = useAt(config, updateConfig, 'bindingVar');

  const view: ToolView = useCallback(({autoFocus}) => (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>let</b>
        {<VarDefinition varConfig={bindingVar} updateVarConfig={updateBindingVar} autoFocus={autoFocus}/>}
      </div>

      <div className="xRow xGap10">
        <b>be</b>
        <ShowView view={bindingView} />
      </div>

      <div className="xRow xGap10">
        <b>in</b>
        <ShowView view={bodyView} />
      </div>
    </div>
  ), [bindingVar, bindingView, bodyView, updateBindingVar]);
  useView(reportView, view);

  return <>
    {bindingComponent}
    {config.bindingVar ?
      <ProvideVar config={config.bindingVar} value={bindingOutput || undefined}>
        {bodyComponent}
      </ProvideVar> :
      bodyComponent
    }
  </>
});
registerTool<LetConfig>(LetTool, 'let', () => ({
  toolName: 'let',
  bindingVar: newVarConfig(),
  bindingConfig: codeConfigSetTo(''),
  bodyConfig: codeConfigSetTo(''),
}));
