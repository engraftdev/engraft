import { memo, useEffect, useMemo, useRef } from "react";
import { ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt, useStateSetOnly } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'apparatus',
  inputProgram: ToolProgram,
  apparatusProject: string | null,
};

export const programFactory: ProgramFactory<Program> = (defaultInputCode) => ({
  toolName: 'apparatus',
  inputProgram: slotSetTo(defaultInputCode || ''),
  apparatusProject: null,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  useOutput(reportOutput, useMemoObject({
    value: program.apparatusProject?.length,
  }));

  useView(reportView, useMemo(() => ({
    render: (renderProps) => <View
      {...props}
      {...renderProps}
      inputView={inputView}
      inputOutput={inputOutput}
    />
  }), [inputOutput, inputView, props]));

  return <>
    {inputComponent}
  </>;
});

type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  inputView: ToolView | null;
  inputOutput: ToolOutput | null;
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, inputView, inputOutput, autoFocus } = props;

  const [ apparatusProject, udpateApparatusProject ] = useAt(program, updateProgram, 'apparatusProject');

  const [iframe, setIframe] = useStateSetOnly<HTMLIFrameElement | null>(null);
  const [port, setPort] = useStateSetOnly<MessagePort | null>(null);

  // Set up channel (once iframe loads)
  useEffect(() => {
    if (!iframe) { return; }
    iframe.addEventListener("load", () => {
      const channel = new MessageChannel();
      // console.log('outer sending channel');
      iframe.contentWindow?.postMessage(['engraft'], '*', [channel.port2]);
      setPort(channel.port1);  // TODO: I'm assuming the port will be ready to use by the time this is done
    });
  }, [iframe, setPort]);

  // Send initial project to channel
  const projectSent = useRef(false);
  useEffect(() => {
    if (!port || projectSent.current) { return; }
    // console.log('outer sending project');
    port.postMessage(['load', apparatusProject]);
    projectSent.current = true;
  });

  // Send input to channel
  useEffect(() => {
    if (!port) { return; }
    // console.log('outer sending input');
    port.postMessage(['input', valueOrUndefined(inputOutput)]);
  }, [port, inputOutput]);

  // Receive saved projects from channel
  useEffect(() => {
    if (!port) { return; }
    port.onmessage = (event) => {
      // console.log('got message', event.data);
      if (event.data[0] === 'save') {
        udpateApparatusProject(() => event.data[1]);
      }
    }
  }, [port, udpateApparatusProject]);

  return <div className="xCol xGap10 xPad10 xWidthFitContent">
    <div className="xRow xGap10">
      <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
    </div>
    <div>
      <iframe
        ref={setIframe}
        src="http://localhost:8090/?engraft=1" width={600} height={600} title="Apparatus editor"
        onScroll={(e) => e.preventDefault()}
        style={{border: 'none', boxShadow: '0px 0px 5px 0px #0008'}}
      />
    </div>
  </div>
});
