import { HTMLProps, memo, useEffect, useRef, useState } from "react";

// This component knows how to embed Apparatus in an iframe and talk to it.
// It contains no references to Engraft per se.

type ApparatusIframeProps = HTMLProps<HTMLIFrameElement> & {
  initialProject?: string | null,
  project?: string | null,
  setProject: (apparatusProject: string) => void,

  input?: unknown,
  regionOfInterest?: { x: [number, number], y: [number, number] },

  setOutput?: (output: unknown) => void,
}

export const ApparatusIframe = memo((props: ApparatusIframeProps) => {
  const { initialProject, project, setProject, input, regionOfInterest, setOutput, title, ...iframeProps } = props;

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
  const initialProjectSent = useRef(false);
  useEffect(() => {
    if (!port || initialProject === undefined || initialProjectSent.current) { return; }
    // console.log('outer sending initial project');
    port.postMessage(['load', initialProject]);
    initialProjectSent.current = true;
  });

  // Send changing project to channel
  useEffect(() => {
    if (!port || project === undefined ) { return; }
    // console.log('outer sending project');
    port.postMessage(['load', project]);
  }, [port, project]);

  // Send input to channel
  // NOTE: If you don't provide an input, this well send `undefined` anyway
  useEffect(() => {
    if (!port) { return; }
    // console.log('outer sending input');
    port.postMessage(['input', input]);
  }, [port, input]);

  // Send region of interest to channel
  useEffect(() => {
    if (!port || regionOfInterest === undefined) { return; }
    // console.log('outer sending roi');
    port.postMessage(['regionOfInterest', regionOfInterest]);
  }, [port, regionOfInterest]);

  // Receive saved projects & output from channel
  useEffect(() => {
    if (!port) { return; }
    port.onmessage = (event) => {
      // console.log('got message', event.data);
      if (event.data[0] === 'save') {
        setProject(event.data[1]);
      } else if (event.data[0] === 'output') {
        setOutput?.(event.data[1]);
      }
    }
  }, [port, setOutput, setProject]);

  return  <iframe
    ref={setIframe}
    title={title}
    {...iframeProps}
  />;
});
