import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useWindowEventListener } from "./useEventListener";

export interface WindowPortalProps {
  children?: ReactNode,
  title?: string
  onClose?: () => void,
}

const WindowPortal = memo(function WindowPortal({children, title, onClose}: WindowPortalProps) {
  const containerEl = useMemo(() => document.createElement('div'), []);

  // NOTE: externalWindow can't be computed in useMemo due to the most bizarre JS behavior I've ever seen
  const [externalWindow, setExternalWindow] = useState<Window>();
  useEffect(() => {
    const win = window.open('', '', 'width=600,height=400,left=200,top=200')!;
    setExternalWindow(win);
    return () => win.close();
  }, [])

  useEffect(() => {
    if (externalWindow) {
      externalWindow.document.body.appendChild(containerEl);
      return () => void externalWindow.document.body.removeChild(containerEl);
    }
  }, [containerEl, externalWindow])

  useEffect(() => {
    if (title && externalWindow) {
      externalWindow.document.title = title
    }
  }, [externalWindow, title]);

  useWindowEventListener('beforeunload', (ev) => {
    onClose && onClose();
  }, externalWindow)

  return ReactDOM.createPortal(children, containerEl);
});
export default WindowPortal
