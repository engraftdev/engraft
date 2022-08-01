import { memo, useCallback, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { registerTool, ToolConfig, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { codeConfigSetTo } from "src/tools/CodeTool";
import { TextConfig } from "src/tools/TextTool";
import { RowToCol } from "src/util/RowToCol";

const offlineDataContext = require.context('./offline-data', true, /\.\/(.*)\.json$/)
const offlineData = Object.fromEntries(
  offlineDataContext.keys().map(id => [
    id.match(/\.\/(.*)$/)![1],
    offlineDataContext(id)
  ])
);

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

    if (offlineData[urlOutput.toolValue]) {
      reportOutput({ toolValue: offlineData[urlOutput.toolValue] })
      return;
    }

    const url = new URL(urlOutput.toolValue);
    let params = paramsOutput?.toolValue as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, typeof v === 'string' ? v : JSON.stringify(v as any)))
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

  const view: ToolView = useCallback(({autoFocus}) => (
    <div className="xCol xGap10 xPad10 xWidthFitContent">
      <RowToCol minRowWidth={200} className="xGap10">
        <b>url</b> <ShowView view={urlView} autoFocus={autoFocus}/>
      </RowToCol>
      <RowToCol minRowWidth={200} className="xGap10">
        <b>params</b> <ShowView view={paramsView}/>
      </RowToCol>
      <div className="xRow">
        <input type='checkbox' checked={autoSend} onChange={(ev) => updateAutoSend(() => ev.target.checked)}/>
        {autoSend ?
          sendDebouncedControl.isPending() ? 'about to auto-send' : 'auto-send on' :
          'auto-send off'}
        <div className="xExpand" />
        <button onClick={send}>send now</button>
      </div>
    </div>
  ), [urlView, paramsView, autoSend, sendDebouncedControl, send, updateAutoSend]);
  useView(reportView, view);

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
registerTool<RequestConfig>(RequestTool, 'request', () => {
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
