import { memo, useCallback, useEffect, useMemo } from "react";
import { codeProgramSetTo } from "src/builtin-tools/code";
import { Program as TextProgram } from "src/builtin-tools/text";
import { hasValue, ProgramFactory, ToolProgram, ToolProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
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
    if (!hasValue(urlOutput) || typeof urlOutput.value !== 'string') { return; }

    if (offlineData[urlOutput.value]) {
      reportOutput({ value: offlineData[urlOutput.value] })
      return;
    }

    const url = new URL(urlOutput.value);
    let params = valueOrUndefined(paramsOutput) as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, typeof v === 'string' ? v : JSON.stringify(v as any)))
    const resp = await fetch(url.toString());
    const data: unknown = await resp.json();
    reportOutput({value: data});
  }, [paramsOutput, reportOutput, urlOutput])

  const [sendDebounced, sendDebouncedControl] = useDebounce(send, 1000)

  useEffect(() => {
    if (autoSend) {
      sendDebounced()
    }
  }, [autoSend, sendDebounced])

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
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
  }), [urlView, paramsView, autoSend, sendDebouncedControl, send, updateAutoSend]));

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
  prop: 'extracts',
  exintro: true,
  grnlimit: 1
}`

