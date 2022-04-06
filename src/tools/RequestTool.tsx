import { memo, useCallback, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { registerTool, ToolConfig, ToolProps } from "../tools-framework/tools";
import { ShowView, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { codeConfigSetTo } from "./CodeTool";
import { TextConfig } from "./TextTool";

export interface RequestConfig extends ToolConfig {
  toolName: 'request';
  urlConfig: ToolConfig;
  paramsConfig: ToolConfig;
  autoSend: boolean;
}

export const RequestTool = memo(function RequestTool({ config, updateConfig, reportOutput, reportView }: ToolProps<RequestConfig>) {
  const [urlComponent, urlView, urlOutput] = useSubTool({config, updateConfig, subKey: 'urlConfig'});
  const [paramsComponent, paramsView, paramsOutput] = useSubTool({config, updateConfig, subKey: 'paramsConfig'});

  const [autoSend, updateAutoSend] = useAt(config, updateConfig, 'autoSend');

  const send = useCallback(async () => {
    if (!urlOutput || typeof urlOutput.toolValue !== 'string') { return; }
    const url = new URL(urlOutput.toolValue);
    let params = paramsOutput?.toolValue as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, (v as any).toString()))
    const resp = await fetch(url.toString());
    const data: unknown = await resp.json();
    reportOutput({toolValue: data});
  }, [paramsOutput?.toolValue, reportOutput, urlOutput])

  const [sendDebounced, sendDebouncedControl] = useDebounce(send, 1000)

  useEffect(() => {
    if (autoSend) {
      sendDebounced()
    }
  }, [autoSend, sendDebounced])

  const render = useCallback(({autoFocus}) => {
    return (
      <div style={{padding: 10}}>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>url</b> <ShowView view={urlView} autoFocus={autoFocus}/>
        </div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>params</b> <ShowView view={paramsView}/>
        </div>
        <div style={{display: 'flex'}}>
          <input type='checkbox' checked={autoSend} onChange={(ev) => updateAutoSend(() => ev.target.checked)}/>
          {autoSend ?
            sendDebouncedControl.isPending() ? 'about to auto-send' : 'auto-send on' :
            'auto-send off'}
          <div style={{flexGrow: 1}} />
          <button onClick={send}>send now</button>
        </div>
      </div>
    );
  }, [urlView, paramsView, autoSend, sendDebouncedControl, send, updateAutoSend]);
  useView(reportView, render, config);

  return <>
    {urlComponent}
    {paramsComponent}
  </>;
});
const paramsDefault = `{
  origin: '*',
  format: 'json',
  action: 'query',
  generator: 'random',
  grnnamespace: 0,
  prop: 'pageimages|extracts',
  exintro: true,
  grnlimit: 1
}`
registerTool<RequestConfig>(RequestTool, () => {
  const textConfig: TextConfig = {
    toolName: 'text',
    text: 'https://en.wikipedia.org/w/api.php',
    subTools: {},
  };
  return {
    toolName: 'request',
    urlConfig: codeConfigSetTo(textConfig),
    paramsConfig: codeConfigSetTo(paramsDefault),
    autoSend: true,
  }
});