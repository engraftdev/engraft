import { useCallback } from "react";
import { registerTool, ToolConfig, ToolProps } from "../tools-framework/tools";
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool";
import { codeConfigSetTo } from "./CodeTool";
import { TextConfig } from "./TextTool";

export interface RequestConfig extends ToolConfig {
  toolName: 'request';
  urlConfig: ToolConfig;
  paramsConfig: ToolConfig;
}

export function RequestTool({ config, updateConfig, reportOutput, reportView }: ToolProps<RequestConfig>) {
  const [urlComponent, urlView, urlOutput] = useSubTool({config, updateConfig, subKey: 'urlConfig'});
  const [paramsComponent, paramsView, paramsOutput] = useSubTool({config, updateConfig, subKey: 'paramsConfig'});

  const sendRequest = useCallback(async () => {
    if (!urlOutput || typeof urlOutput.toolValue !== 'string') { return; }
    const url = new URL(urlOutput.toolValue);
    let params = paramsOutput?.toolValue as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, (v as any).toString()))
    const resp = await fetch(url.toString());
		const data: unknown = await resp.json();
    reportOutput({toolValue: data});
  }, [paramsOutput, reportOutput, urlOutput]);

  const render = useCallback(({autoFocus}) => {
    return (
      <div style={{padding: 10}}>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>url</b> <ShowView view={urlView} autoFocus={autoFocus}/>
        </div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>params</b> <ShowView view={paramsView}/>
        </div>
        <button onClick={sendRequest}>send</button>
      </div>
    );
  }, [paramsView, sendRequest, urlView]);
  useView(reportView, render, config);

  return <>
    {urlComponent}
    {paramsComponent}
  </>;
}
const paramsDefault = `{
  origin: '*',
  format: 'json',
  action: 'query',
  generator: 'random',
  grnnamespace: 0,
  prop: 'pageimages|extracts',
  exintro: true,
  rvprop: 'content',
  grnlimit: 1
}`
registerTool<RequestConfig>(RequestTool, () => {
  const textConfig: TextConfig = {
    toolName: 'text',
    text: 'https://en.wikipedia.org/w/api.php',
    subTools: {}
  };
  return {
    toolName: 'request',
    urlConfig: codeConfigSetTo(textConfig),
    paramsConfig: codeConfigSetTo(paramsDefault),
  }
});