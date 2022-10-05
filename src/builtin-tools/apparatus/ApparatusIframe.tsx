import { HTMLProps, memo, useEffect, useRef, useState } from "react";

// This component knows how to embed Apparatus in an iframe and talk to it.
// It contains no references to Engraft per se.

type ApparatusIframeProps = HTMLProps<HTMLIFrameElement> & {
  project: string | null;
  setProject: (apparatusProject: string) => void;

  input: unknown;
}

export const ApparatusIframe = memo((props: ApparatusIframeProps) => {
  const { project, setProject, input, title, ...iframeProps } = props;

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [port, setPort] = useState<MessagePort | null>(null);

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

  // Send initial project (or absence thereof) to channel
  const projectSent = useRef(false);
  useEffect(() => {
    if (!port || projectSent.current) { return; }
    // console.log('outer sending project');
    port.postMessage(['load', project]);
    projectSent.current = true;
  });

  // Send input to channel
  useEffect(() => {
    if (!port) { return; }
    // console.log('outer sending input');
    port.postMessage(['input', input]);
  }, [port, input]);

  // Receive saved projects from channel
  useEffect(() => {
    if (!port) { return; }
    port.onmessage = (event) => {
      // console.log('got message', event.data);
      if (event.data[0] === 'save') {
        setProject(event.data[1]);
      }
    }
  }, [port, setProject]);

  return  <iframe
    ref={setIframe}
    title={title}
    {...iframeProps}
  />;
});
