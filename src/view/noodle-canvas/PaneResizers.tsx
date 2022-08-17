import { memo, useState, useCallback, CSSProperties } from "react";
import { updateF } from "src/util/updateF";
import useHover from "src/util/useHover";
import { useRefForCallback } from "src/util/useRefForCallback";
import { roundTo } from "./model";
import { PaneViewProps } from "./PaneView";

export const PaneResizers = memo(function PaneResizers(props: PaneViewProps) {
  const { pane, updatePaneById } = props;
  const paneRef = useRefForCallback(pane);

  const [draggingL, setDraggingL] = useState(false);
  const [draggingR, setDraggingR] = useState(false);
  const [draggingB, setDraggingB] = useState(false);

  const onMouseDownResizerLeft = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newX = roundTo(startPane.x + currentEvent.clientX - startEvent.clientX, 16);
      const newWidth = startPane.width + startPane.x - newX;
      updatePaneById(pane.id, updateF({
        x: {$set: newX}, width: {$set: newWidth},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-ew-resize');
      setDraggingL(false);

    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-ew-resize');
    setDraggingL(true);
  }, [pane.id, paneRef, updatePaneById]);

  const onMouseDownResizerRight = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newWidth = roundTo(startPane.width + currentEvent.clientX - startEvent.clientX, 16);
      updatePaneById(pane.id, updateF({
        width: {$set: newWidth},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-ew-resize');
      setDraggingR(false);
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-ew-resize');
    setDraggingR(true);
  }, [pane.id, paneRef, updatePaneById]);

  const onMouseDownResizerBottom = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newHeight = roundTo(startPane.height + currentEvent.clientY - startEvent.clientY, 16);
      updatePaneById(pane.id, updateF({
        height: {$set: newHeight},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-ns-resize');
      setDraggingB(false);
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-ns-resize');
    setDraggingB(true);
  }, [pane.id, paneRef, updatePaneById]);

  const onMouseDownResizerBottomLeft = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newX = roundTo(startPane.x + currentEvent.clientX - startEvent.clientX, 16);
      const newWidth = startPane.width + startPane.x - newX;
      const newHeight = roundTo(startPane.height + currentEvent.clientY - startEvent.clientY, 16);
      updatePaneById(pane.id, updateF({
        x: {$set: newX}, width: {$set: newWidth}, height: {$set: newHeight},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-nesw-resize');
      setDraggingB(false);
      setDraggingL(false);
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-nesw-resize');
    setDraggingB(true);
    setDraggingL(true);
  }, [pane.id, paneRef, updatePaneById]);

  const onMouseDownResizerBottomRight = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newWidth = roundTo(startPane.width + currentEvent.clientX - startEvent.clientX, 16);
      const newHeight = roundTo(startPane.height + currentEvent.clientY - startEvent.clientY, 16);
      updatePaneById(pane.id, updateF({
        width: {$set: newWidth}, height: {$set: newHeight},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-nwse-resize');
      setDraggingB(false);
      setDraggingR(false);
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-nwse-resize');
    setDraggingB(true);
    setDraggingR(true);
  }, [pane.id, paneRef, updatePaneById]);

  const [refL, hoveredL] = useHover();
  const [refR, hoveredR] = useHover();
  const [refB, hoveredB] = useHover();
  const [refBL, hoveredBL] = useHover();
  const [refBR, hoveredBR] = useHover();

  const highlightL = hoveredL || hoveredBL || draggingL;
  const highlightR = hoveredR || hoveredBR || draggingR;
  const highlightB = hoveredB || hoveredBL || hoveredBR || draggingB;

  const resizerStyle: CSSProperties = {
    position: 'absolute',
    zIndex: 1,
    overflow: 'hidden',
    touchAction: 'none',
  }

  const resizerHighlightStyle: CSSProperties = {
    position: 'absolute',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'rgb(156, 156, 155)',
    borderStyle: 'solid',
    borderRadius: '0.25rem',
    transitionProperty: 'opacity',
    transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)',
    transitionDuration: '.15s',
  }

  // TODO: maintain cursor during drag, even when not hovered

  return <>
    <div
      ref={refL}
      className="resizer-left"
      style={{
        ...resizerStyle,
        width: '0.75rem',
        left: '-0.5rem',
        top: 0,
        bottom: 0,
        cursor: 'ew-resize',
      }}
      onMouseDown={onMouseDownResizerLeft}
    >
      <div
        className="resizer-left-highlight"
        style={{
          ...resizerHighlightStyle,
          top: 0,
          bottom: 0,
          left: 7,
          width: '0.5rem',
          borderLeftWidth: 1,
          opacity: highlightL ? 1 : 0,
        }}
      />
    </div>
    <div
      ref={refR}
      className="resizer-right"
      style={{
        ...resizerStyle,
        width: '0.75rem',
        right: '-0.5rem',
        top: 0,
        bottom: 0,
        cursor: 'ew-resize',
      }}
      onMouseDown={onMouseDownResizerRight}
    >
      <div
        className="resizer-right-highlight"
        style={{
          ...resizerHighlightStyle,
          top: 0,
          bottom: 0,
          right: 7,
          width: '0.5rem',
          borderRightWidth: 1,
          opacity: highlightR ? 1 : 0,
        }}
      />
    </div>
    <div
      ref={refB}
      className="resizer-bottom"
      style={{
        ...resizerStyle,
        left: 0,
        right: 0,
        height: '0.75rem',
        bottom: '-0.5rem',
        cursor: 'ns-resize',
      }}
      onMouseDown={onMouseDownResizerBottom}
    >
      <div
        className="resizer-bottom-highlight"
        style={{
          ...resizerHighlightStyle,
          left: 0,
          right: 0,
          height: '0.5rem',
          bottom: 7,
          borderBottomWidth: 1,
          opacity: highlightB ? 1 : 0,
        }}
      />
    </div>
    <div
      ref={refBL}
      className="resizer-bottom-left"
      style={{
        ...resizerStyle,
        width: '1rem',
        height: '1rem',
        left: '-0.5rem',
        bottom: '-0.5rem',
        cursor: 'nesw-resize',
      }}
      onMouseDown={onMouseDownResizerBottomLeft}
    />
    <div
      ref={refBR}
      className="resizer-bottom-right"
      style={{
        ...resizerStyle,
        width: '1rem',
        height: '1rem',
        right: '-0.5rem',
        bottom: '-0.5rem',
        cursor: 'nwse-resize',
      }}
      onMouseDown={onMouseDownResizerBottomRight}
    />
  </>;
})
