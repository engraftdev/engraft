import { memo, useCallback, useEffect } from "react";
import { ProgramFactory, ToolProgram, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
import { codeProgramSetTo } from "src/tools/CodeTool";
import { Program as TextProgram } from "src/tools/TextTool";
import { RowToCol } from "src/util/RowToCol";
import { useAt } from "src/util/state";
import { useDebounce } from "use-debounce";

const offlineDataContext = require.context('./offline-data', true, /\.\/(.*)\.json$/)
const offlineData = Object.fromEntries(
  offlineDataContext.keys().map(id => [
    id.match(/\.\/(.*)$/)![1],
    offlineDataContext(id)
  ])
);

export type Program = {
  toolName: 'request';
  urlProgram: ToolProgram;
  paramsProgram: ToolProgram;
  autoSend: boolean;
}

export const programFactory: ProgramFactory<Program> = () => {
  const textProgram: TextProgram = {
    toolName: 'text',
    text: 'https://en.wikipedia.org/w/api.php',
    subTools: {},
  };
  return {
    toolName: 'request',
    urlProgram: codeProgramSetTo(textProgram),
    paramsProgram: codeProgramSetTo(paramsDefault),
    autoSend: true,
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [urlComponent, urlView, urlOutput] = useSubTool({program, updateProgram, subKey: 'urlProgram'});
  const [paramsComponent, paramsView, paramsOutput] = useSubTool({program, updateProgram, subKey: 'paramsProgram'});

  const [autoSend, updateAutoSend] = useAt(program, updateProgram, 'autoSend');

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

