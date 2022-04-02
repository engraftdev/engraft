import { memo, ReactNode, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";

export interface WindowPortalProps {
  children?: ReactNode
}

const WindowPortal = memo(function WindowPortal({children}: WindowPortalProps) {
  const containerEl = useMemo(() => document.createElement('div'), []);
  const externalWindow = useRef<Window>();

  useEffect(() => {
    externalWindow.current = window.open('', '', 'width=600,height=400,left=200,top=200')!;
    externalWindow.current.document.body.appendChild(containerEl);
    return () => externalWindow.current?.close();
  }, [containerEl])

  return ReactDOM.createPortal(children, containerEl);
});
export default WindowPortal