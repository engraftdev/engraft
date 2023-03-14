import { CSSProperties, memo, useMemo, useState } from "react";
import { combineDrags, someDrag, startDrag } from "../../util/drag.js";
import { UpdateProxy } from "@engraft/update-proxy";
import useHover from "../../util/useHover.js";
import { useRefForCallback } from "../../util/useRefForCallback.js";
import { PaneGeo, roundTo } from "./model.js";

export type PaneResizersProps = {
  geo: PaneGeo,
  geoUP: UpdateProxy<PaneGeo>,
  minWidth?: number,
  minHeight?: number,
  scale: number,
}

export const PaneResizers = memo(function PaneResizers(props: PaneResizersProps) {
  const { geo, geoUP, minWidth, minHeight, scale } = props;
  const geoRef = useRefForCallback(geo);

  const [draggingL, setDraggingL] = useState(false);
  const [draggingR, setDraggingR] = useState(false);
  const [draggingB, setDraggingB] = useState(false);

  const leftDrag = useMemo(() => someDrag({
    init() {
      setDraggingL(true);
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const deltaX = this.startDeltaX / scale;
      const startRight = startGeo.x + startGeo.width;
      const newX = roundTo(startGeo.x + deltaX, 16);
      const newWidth = Math.max(startRight - newX, minWidth || 0);
      const actualNewX = startRight - newWidth;
      geoUP.x.$set(actualNewX);
      geoUP.width.$set(newWidth);
    },
    done() {
      setDraggingL(false);
    },
    keepCursor: true,
  }), [geoRef, geoUP, minWidth, scale]);

  const rightDrag = useMemo(() => someDrag({
    init() {
      setDraggingR(true);
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const deltaX = this.startDeltaX / scale;
      const newWidth = Math.max(roundTo(startGeo.width + deltaX, 16), minWidth || 0);
      geoUP.width.$set(newWidth);
    },
    done() {
      setDraggingR(false);
    },
    keepCursor: true,
  }), [geoRef, geoUP, minWidth, scale]);

  const bottomDrag = useMemo(() => someDrag({
    init() {
      setDraggingB(true);
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const deltaY = this.startDeltaY / scale;
      const newHeight = Math.max(roundTo(startGeo.height + deltaY, 16), minHeight || 0);
      geoUP.height.$set(newHeight);
    },
    done() {
      setDraggingB(false);
    },
    keepCursor: true,
  }), [geoRef, geoUP, minHeight, scale]);

  const onMouseDownLeft = useMemo(() => startDrag(leftDrag), [leftDrag]);
  const onMouseDownRight = useMemo(() => startDrag(rightDrag), [rightDrag]);
  const onMouseDownBottom = useMemo(() => startDrag(bottomDrag), [bottomDrag]);
  const onMouseDownBottomLeft = useMemo(() => startDrag(combineDrags(bottomDrag, leftDrag)), [bottomDrag, leftDrag]);
  const onMouseDownBottomRight = useMemo(() => startDrag(combineDrags(bottomDrag, rightDrag)), [bottomDrag, rightDrag]);

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
      onMouseDown={onMouseDownLeft}
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
      onMouseDown={onMouseDownRight}
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
      onMouseDown={onMouseDownBottom}
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
      onMouseDown={onMouseDownBottomLeft}
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
      onMouseDown={onMouseDownBottomRight}
    />
  </>;
})
