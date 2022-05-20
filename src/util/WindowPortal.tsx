import { memo, ReactNode, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useWindowEventListener } from "./useEventListener";

export interface UseWindowContainerProps {
  title?: string
  onClose?: () => void,
}

export function useWindowContainer({title, onClose}: UseWindowContainerProps): HTMLDivElement | undefined {
  const container = useMemo(() => document.createElement('div'), []);

  // NOTE: externalWindow can't be computed in useMemo due to the most bizarre JS behavior I've ever seen
  const [externalWindow, setExternalWindow] = useState<Window>();
  useEffect(() => {
    const win = window.open('', '', 'width=600,height=400,left=200,top=200')!;
    setExternalWindow(win);
    return () => win.close();
  }, [])

  useEffect(() => {
    if (externalWindow) {
      externalWindow.document.body.appendChild(container);
      return () => void externalWindow.document.body.removeChild(container);
    }
  }, [container, externalWindow])

  useEffect(() => {
    if (title && externalWindow) {
      externalWindow.document.title = title
    }
  }, [externalWindow, title]);

  useWindowEventListener('beforeunload', (ev) => {
    onClose && onClose();
  }, externalWindow);

  return externalWindow ? container : undefined;
}



export interface WindowPortalProps extends UseWindowContainerProps {
  children?: ReactNode,
}

export const WindowPortal = memo(function WindowPortal({children, ...props}: WindowPortalProps) {
  const container = useWindowContainer(props);
  if (container) {
    return ReactDOM.createPortal(children, container);
  } else {
    return <></>;
  }
});
