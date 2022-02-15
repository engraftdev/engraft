import { useEffect, useMemo } from "react"
import FunctionComponent from "../util/FunctionComponent"
import { setKeys } from "../util/setKeys"
import { registerTool, ToolConfig, toolIndex, ToolProps, useSubTool } from "../tools-framework/tools"

export interface LetConfig extends ToolConfig {
  toolName: 'let';
  bindingKey: string;
  bindingConfig: ToolConfig;
  bodyConfig: ToolConfig;
}

export function LetTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<LetConfig>) {
  const binding = useSubTool({context, config, reportConfig, subKey: 'bindingConfig'})

  const contextForBody = useMemo(() => {
    return binding.value ? {...context, [config.bindingKey]: binding.value} : context
  }, [binding.value, config.bindingKey, context])

  const body = useSubTool({context: contextForBody, config, reportConfig, subKey: 'bodyConfig'})

  useEffect(() => {
    reportOutput.set(body.value);
  }, [body.value, reportOutput])

  useEffect(() => {
    reportView.set(() => {
      return (
        <div>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>let</b>
            <input type="text" value={config.bindingKey} onChange={(ev) => reportConfig.update(setKeys({bindingKey: ev.target.value}))}/>
          </div>

          <div className="row-top" style={{marginBottom: 10}}>
            <b>be</b>
            <FunctionComponent f={binding.view} ifMissing={<span>missing binding view</span>} />
          </div>

          <div className="row-top" style={{marginBottom: 10}}>
            <b>in</b>
            <FunctionComponent f={body.view} ifMissing={<span>missing body view</span>} />
          </div>
        </div>
      );
    });
    return () => reportView.set(null);
  }, [config.bindingKey, reportView, reportConfig, binding.view, body.view]);

  return <>
    {binding.component}
    {body.component}
  </>
}
registerTool(LetTool, {
  toolName: 'let',
  bindingKey: 'x',
  bindingConfig: toolIndex['code'].defaultConfig,
  bodyConfig: toolIndex['code'].defaultConfig
});
