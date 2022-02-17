import { useCallback, useEffect } from "react";
import { registerTool, ToolConfig, ToolProps } from "../tools-framework/tools";
import { useSubTool } from "../tools-framework/useSubTool";
import compile from "../util/compile";
import { updateKeys } from "../util/state";
import { CodeConfig } from "./CodeTool";

export interface RequestConfig extends ToolConfig {
  toolName: 'request';
  url: string;  // TODO: subtool! default text-editor
  paramsConfig: ToolConfig;
}

export function RequestTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<RequestConfig>) {
  const [paramsComponent, paramsMakeView, paramsOutput] = useSubTool({context, config, updateConfig, subKey: 'paramsConfig'});

  const sendRequest = useCallback(async () => {
    const url = new URL(config.url);
    let params = paramsOutput?.toolValue as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, (v as any).toString()))
    const resp = await fetch(url.toString());
		const data: unknown = await resp.json();
    reportOutput({toolValue: data});
  }, [config.url, paramsOutput?.toolValue, reportOutput]);

  useEffect(() => {
    reportView(() => {
      return (
        <div>
          <h2>request</h2>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>url</b> <input value={config.url} onChange={(ev) => updateKeys(updateConfig, {url: ev.target.value})} />
          </div>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>params</b> {paramsMakeView({})}
          </div>
          <button onClick={sendRequest}>send</button>
        </div>
      );
    })
    return () => reportView(null);
  }, [config.url, paramsMakeView, reportView, sendRequest, updateConfig]);

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