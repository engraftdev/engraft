import { memo, useCallback, useEffect, useMemo } from "react";
import { slotSetTo } from "src/builtin-tools/slot";
import { Program as TextProgram } from "src/builtin-tools/text";
import { hasValue, ProgramFactory, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
import { RowToCol } from "src/util/RowToCol";
import { safeToString } from "src/util/safeToString";
import { useAt, useStateSetOnly } from "src/util/state";
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
    text: 'https://httpbin.org/get',
    subTools: {},
  };
  return {
    toolName: 'request',
    urlProgram: slotSetTo(textProgram),
    paramsProgram: slotSetTo(paramsDefault),
    autoSend: true,
  }
};
const paramsDefault = `{
  my_param: "hello world!"
}`;

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [urlComponent, urlView, urlOutput] = useSubTool({program, updateProgram, subKey: 'urlProgram'});
  const [paramsComponent, paramsView, paramsOutput] = useSubTool({program, updateProgram, subKey: 'paramsProgram'});

  const [response, setResponse] = useStateSetOnly<Response | null>(null);

  const send = useCallback(async () => {
    setResponse(null);

    // TODO: what should happen to output when a request is pending?
    reportOutput(null);

    if (!hasValue(urlOutput) || typeof urlOutput.value !== 'string') { return; }

    if (offlineData[urlOutput.value]) {
      reportOutput({ value: offlineData[urlOutput.value] })
      return;
    }

    const url = new URL(urlOutput.value);
    let params = valueOrUndefined(paramsOutput) as object || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, typeof v === 'string' ? v : JSON.stringify(v as any)))
    try {
      const resp = await fetch(url.toString());
      setResponse(resp);
      const data: unknown = await resp.json();
      reportOutput({value: data});
    } catch (e) {
      console.log("error", e);
      reportOutput({error: safeToString(e) || 'unknown error'});
    }
  }, [paramsOutput, reportOutput, setResponse, urlOutput])

  const [sendDebounced, sendDebouncedControl] = useDebounce(send, 1000)

  useEffect(() => {
    if (program.autoSend) {
      sendDebounced()
    }
  }, [program.autoSend, sendDebounced])

  const isPending = sendDebouncedControl.isPending();

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <View {...props} {...viewProps}
        urlView={urlView}
        paramsView={paramsView}
        response={response}
        isPending={isPending}
        send={send}
      />
  }), [props, urlView, paramsView, response, isPending, send]));

  return <>
    {urlComponent}
    {paramsComponent}
  </>;
});


type ViewProps = ToolViewRenderProps & ToolProps<Program> & {
  urlView: ToolView | null,
  paramsView: ToolView | null,

  isPending: boolean,
  send: () => void,
  response: Response | null,
}

const View = memo((props: ViewProps) => {
  const { autoFocus, program, updateProgram, urlView, paramsView, isPending, send, response } = props;

  const [autoSend, updateAutoSend] = useAt(program, updateProgram, 'autoSend');

  const [headersOpen, setHeadersOpen] = useStateSetOnly(false);

  return <div className="xCol xGap10 xPad10 xWidthFitContent">
    <RowToCol minRowWidth={200} className="xGap10">
      <b>url</b> <ShowView view={urlView} autoFocus={autoFocus}/>
    </RowToCol>
    <RowToCol minRowWidth={200} className="xGap10">
      <b>params</b> <ShowView view={paramsView}/>
    </RowToCol>
    <div className="xRow">
      <input type='checkbox' checked={autoSend} onChange={(ev) => updateAutoSend(() => ev.target.checked)}/>
      {autoSend ?
        isPending ? 'about to auto-send' : 'auto-send on' :
        'auto-send off'}
      <div className="xExpand" />
      <button onClick={send}>send now</button>
    </div>
    { response &&
      <div className="xRow">
        <details
          open={headersOpen}
          onToggle={(ev) => setHeadersOpen(ev.currentTarget.open)}
          style={{fontSize: '13px'}}
        >
          <summary>{[...response.headers].length} response headers</summary>
          {[...response.headers].map(([k, v]) =>
            <div
              key={k}
              style={{
                paddingLeft: '2em',
                textIndent: '-1em',
              }}
            >
              <b>{k}:</b> {v}
            </div>
          )}
        </details>
      </div>
    }
  </div>
});
