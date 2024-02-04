import { CollectReferences, MakeProgram, ShowView, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, renderWithReact, useCommonWidth, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import humanizeDuration from "humanize-duration";
import { Fragment, memo, useEffect, useState } from "react";

export type Program = {
  toolName: 'vite-lib',
  urlProgram: ToolProgram,
  lastUpdateMs: number,
}

const makeProgram: MakeProgram<Program> = (context, _defaultInputCode) => ({
  toolName: 'vite-lib',
  urlProgram: context.makeSlotWithCode('"http://localhost:5174/typeset.ts"'),
  lastUpdateMs: 0,
});

const collectReferences: CollectReferences<Program> = (program) => [];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const urlResult = hookRunTool({program: program.urlProgram, varBindings, context});

  const outputP = hookMemo(() => {
    return urlResult.outputP.then(async (urlOutput) => {
      const fullUrl = urlOutput.value + '#cacheBuster=' + program.lastUpdateMs;
      const module = await import(/* @vite-ignore */ fullUrl) as unknown;
      return {value: module};
    });
  }, [program.lastUpdateMs, urlResult.outputP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((renderProps) => <View {...props} {...renderProps} urlResult={urlResult} />),
  }), [props, urlResult]);

  return {outputP, view};
}));

export default defineTool({ name: 'vite-lib', makeProgram, collectReferences, run })

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  urlResult: ToolResult<ToolProgram>,
}) => {
  const { autoFocus, urlResult, program, updateProgram } = props;
  const programUP = useUpdateProxy(updateProgram);

  const urlOutputState = usePromiseState(urlResult.outputP);

  const [ wsConnected, setWsConnected ] = useState(false);
  useEffect(() => {
    if (urlOutputState.status !== 'fulfilled') { return; }

    const url = urlOutputState.value.value;
    if (typeof url !== 'string') {
      console.error('vite-lib: url is not a string:', url);
      return;
    }
    const host = new URL(url).host;

    const aws = new AutoWebSocket(`ws://${host}/`, 'vite-hmr', (wsServer) => {
      wsServer.addEventListener('message', (e) => {
        // TODO: if we really want, maybe we can make this more precisely check
        // whether the target file changed?
        programUP.lastUpdateMs.$set(Date.now());
      });

      wsServer.addEventListener('open', () => setWsConnected(true));
      wsServer.addEventListener('close', () => setWsConnected(false));
    });

    return () => {
      aws.close();
    };
  }, [programUP.lastUpdateMs, urlOutputState])

  const leftCommonWidth = useCommonWidth();

  return <div className="xCol xGap10 xPad10">
    <div className="xRow xGap10">
      {leftCommonWidth.wrap(<b>url</b>, 'right')}
      <ShowView view={urlResult.view} updateProgram={programUP.urlProgram.$apply} autoFocus={autoFocus} />
    </div>
    <div className="xRow xGap10">
      {leftCommonWidth.wrap(<Fragment/>, 'right')}
      <button onClick={() => programUP.lastUpdateMs.$set(Date.now())}>update</button>
      <div style={{fontSize: "60%"}}>
        { wsConnected
          ? <div style={{color: 'green'}}>websocket connected</div>
          : <div style={{color: 'red'}}>websocket disconnected</div>
        }
        <div>last updated <HumanizeDuration pastMs={program.lastUpdateMs} /> ago</div>
      </div>
    </div>
  </div>;
})

class AutoWebSocket {
  wsServer: WebSocket | null = null;
  timeout: NodeJS.Timeout | null = null;

  constructor (url: string | URL, protocols: string | string[] | undefined, onRetry: (wsServer: WebSocket) => void) {
    const connect = () => {
      console.log('aWS: Connecting...');

      this.wsServer = new WebSocket(url, protocols);

      this.wsServer.addEventListener('open', () => {
        console.log('aWS: Connected.');
      });

      this.wsServer.addEventListener('close', (e) => {
        console.log('aWS: Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        this.timeout = setTimeout(function() {
          connect();
        }, 1000);
      });

      this.wsServer.addEventListener('error', (err) => {
        console.error('aWS: Socket encountered error: ', err, 'Closing socket');
        this.wsServer!.close();
      });

      onRetry(this.wsServer);
    }
    connect();
  }

  close() {
    if (this.wsServer) {
      this.wsServer.close();
    }
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
    }
  }
}

const HumanizeDuration = memo((props: {pastMs: number}) => {
  const { pastMs } = props;
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  });

  return <>{humanizeDuration(nowMs - pastMs, {round: true, units: ["y", "mo", "w", "d", "h", "m"]})}</>;
});

