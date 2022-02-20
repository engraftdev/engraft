import { useCallback } from "react";
import { registerTool, ToolConfig, ToolProps } from "../tools-framework/tools";
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool";
import ControlledTextInput from "../util/ControlledTextInput";
import { updateKeys } from "../util/state";
import { CodeConfig } from "./CodeTool";

export interface RequestConfig extends ToolConfig {
  toolName: 'request';
  url: string;  // TODO: subtool! default text-editor
  paramsConfig: ToolConfig;
}

export function RequestTool({ config, updateConfig, reportOutput, reportView }: ToolProps<RequestConfig>) {
  const [paramsComponent, paramsView, paramsOutput] = useSubTool({config, updateConfig, subKey: 'paramsConfig'});

  const sendRequest = useCallback(async () => {
    const url = new URL(config.url);
    let params = paramsOutput?.toolValue as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, (v as any).toString()))
    const resp = await fetch(url.toString());
		const data: unknown = await resp.json();
    reportOutput({toolValue: data});
  }, [config.url, paramsOutput?.toolValue, reportOutput]);

  const render = useCallback(() => {
    return (
      <div>
        <h2>request</h2>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>url</b> <ControlledTextInput value={config.url} onChange={(ev) => updateKeys(updateConfig, {url: ev.target.value})} />
        </div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>params</b> <ShowView view={paramsView}/>
        </div>
        <button onClick={sendRequest}>send</button>
      </div>
    );
  }, [config.url, paramsView, sendRequest, updateConfig]);
  useView(reportView, render, config);

  return <>
    {paramsComponent}
  </>;
}
const paramsDefault = `{
  origin: '*',
  format: 'json',
  action: 'query',
  generator: 'random',
  grnnamespace: 0,
  // prop: 'revisions|images',
  rvprop: 'content',
  grnlimit: 1
}`
registerTool(RequestTool, {
  toolName: 'request',
  url: 'https://en.wikipedia.org/w/api.php',
  paramsConfig: {
    toolName: 'code',
    mode: {
      modeName: 'text',
      text: paramsDefault
    }
  } as CodeConfig,
});