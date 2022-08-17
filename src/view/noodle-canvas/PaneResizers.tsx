import { memo, useMemo, useState, useCallback, CSSProperties } from "react";
import { update } from "src/deps";
import { drag } from "src/util/drag";
import { updateF } from "src/util/updateF";
import useHover from "src/util/useHover";
import { useRefForCallback } from "src/util/useRefForCallback";
import { PaneGeo, roundTo } from "./model";
import { PaneViewProps } from "./PaneView";

function dragLeft (startGeo: PaneGeo, deltaX: number, minWidth?: number): (old: PaneGeo) => PaneGeo {
  const startRight = startGeo.x + startGeo.width;
  const newX = roundTo(startGeo.x + deltaX, 16);
  const newWidth = Math.max(startRight - newX, minWidth || 0);
  const actualNewX = startRight - newWidth;
  return updateF({
    x: {$set: actualNewX}, width: {$set: newWidth},
  });
}

export const PaneResizers = memo(function PaneResizers(props: PaneViewProps) {
  const { pane, updatePaneGeoById, minWidth, minHeight } = props;
  const geoRef = useRefForCallback(pane.geo);

  const [draggingL, setDraggingL] = useState(false);
  const [draggingR, setDraggingR] = useState(false);
  const [draggingB, setDraggingB] = useState(false);

  const onMouseDownResizerLeft = useMemo(() => drag({
    init() {
      setDraggingL(true);
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      updatePaneGeoById(pane.id,
        dragLeft(startGeo, this.event.clientX - this.startEvent.clientX, minWidth)
      );
    },
    done() {
      setDraggingL(false);
    },
    keepCursor: true,
  }), [geoRef, minWidth, pane.id, updatePaneGeoById]);

  const onMouseDownResizerRight = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startGeo = geoRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newWidth = Math.max(roundTo(startGeo.width + currentEvent.clientX - startEvent.clientX, 16), minWidth || 0);
      updatePaneGeoById(pane.id, updateF({
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
  }, [geoRef, minWidth, pane.id, updatePaneGeoById]);

  const onMouseDownResizerBottom = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startGeo = geoRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newHeight = Math.max(roundTo(startGeo.height + currentEvent.clientY - startEvent.clientY, 16), minHeight || 0);
      updatePaneGeoById(pane.id, updateF({
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
  }, [geoRef, minHeight, pane.id, updatePaneGeoById]);

  const onMouseDownResizerBottomLeft = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startGeo = geoRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newX = roundTo(startGeo.x + currentEvent.clientX - startEvent.clientX, 16);
      const newWidth = Math.max(startGeo.width + startGeo.x - newX, minWidth || 0);
      const newHeight = Math.max(roundTo(startGeo.height + currentEvent.clientY - startEvent.clientY, 16), minHeight || 0);
      updatePaneGeoById(pane.id, updateF({
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
  }, [geoRef, minHeight, minWidth, pane.id, updatePaneGeoById]);

  const onMouseDownResizerBottomRight = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startGeo = geoRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newWidth = Math.max(roundTo(startGeo.width + currentEvent.clientX - startEvent.clientX, 16), minWidth || 0);
      const newHeight = Math.max(roundTo(startGeo.height + currentEvent.clientY - startEvent.clientY, 16), minHeight || 0);
      updatePaneGeoById(pane.id, updateF({
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
  }, [geoRef, minHeight, minWidth, pane.id, updatePaneGeoById]);

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
