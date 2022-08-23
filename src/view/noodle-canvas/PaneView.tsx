import { memo, useCallback, useMemo } from "react";
import { startDrag } from "src/util/drag";
import { updateF } from "src/util/updateF";
import { useRefForCallback } from "src/util/useRefForCallback";


import { Pane, PaneGeo, roundTo } from "./model";
import { PaneResizers } from "./PaneResizers";

export type PaneViewProps = {
  pane: Pane,
  updatePaneGeoById: (id: string, f: (old: PaneGeo) => PaneGeo) => void,
  minWidth?: number,
  minHeight?: number,
  scale: number,
}

export const PaneView = memo(function Pane(props: PaneViewProps) {
  const { pane, updatePaneGeoById, minWidth, minHeight, scale } = props;
  const geoRef = useRefForCallback(pane.geo);

  const updateGeo = useCallback((f: (old: PaneGeo) => PaneGeo) => {
    updatePaneGeoById(pane.id, f);
  }, [updatePaneGeoById, pane.id]);

  const onMouseDownDragPane = useMemo(() => startDrag({
    init() {
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const newX = roundTo(startGeo.x + this.startDeltaX / scale, 16);
      const newY = roundTo(startGeo.y + this.startDeltaY / scale, 16);
      updateGeo(updateF({ x: {$set: newX}, y: {$set: newY} }));
    },
    done() {},
    cursor: "grabbing",
  }), [geoRef, scale, updateGeo]);

  return (
    <div
      key={pane.id}
      className="PaneView"
      style={{
        position: 'absolute',
        top: pane.geo.y,  // used to use `transform` cuz Natto does, but that breaks CM tooltips
        left: pane.geo.x,
      }}
    >
      <div
        className="PaneView-sizer"
        style={{
          width: pane.geo.width + 1,
          height: pane.geo.height + 1,
          backgroundColor: 'rgb(255, 255, 255)',
          borderRadius: '0.25rem',
          boxShadow: '0 0 #0000,0 0 #0000,0 1px 16px 0 rgba(0, 0, 0, .12)'
        }}
      >
        <PaneResizers
          geo={pane.geo}
          updateGeo={updateGeo}
          minWidth={minWidth}
          minHeight={minHeight}
          scale={scale}
        />
        <div
          className="PaneView-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: "hidden",
          }}
        >
          <div
            className="PaneView-children-wrapper"
            style={{
              // overflow: 'hidden',  // disabled for CodeMirror popups
              flexGrow: 1,
              minHeight: 0,
            }}
          >
            {pane.children({onMouseDownDragPane})}
          </div>
        </div>
      </div>
    </div>
  )
});
