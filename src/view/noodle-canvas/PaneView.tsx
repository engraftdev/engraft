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
}

export const PaneView = memo(function Pane(props: PaneViewProps) {
  const { pane, updatePaneGeoById, minWidth, minHeight } = props;
  const geoRef = useRefForCallback(pane.geo);

  const updateGeo = useCallback((f: (old: PaneGeo) => PaneGeo) => {
    updatePaneGeoById(pane.id, f);
  }, [updatePaneGeoById, pane.id]);

  const onMouseDownDrag = useMemo(() => startDrag({
    init() {
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const newX = roundTo(startGeo.x + this.event.clientX - this.startEvent.clientX, 16);
      const newY = roundTo(startGeo.y + this.event.clientY - this.startEvent.clientY, 16);
      updateGeo(updateF({ x: {$set: newX}, y: {$set: newY} }));
    },
    done() {},
    cursor: "grabbing",
  }), [geoRef, updateGeo]);

  return (
    <div
      key={pane.id}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${pane.geo.x}px, ${pane.geo.y}px)`,
      }}
    >
      <div
        style={{
          width: pane.geo.width,
          height: pane.geo.height,
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
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div
            style={{
              height: '2rem',
              backgroundColor: 'rgb(240, 240, 240)',
              borderRadius: '0.25rem 0.25rem 0 0',
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              flexShrink: 0,
            }}
            onMouseDown={onMouseDownDrag}
          >
            {pane.heading}
          </div>
          <div
            style={{
              overflow: 'hidden',
            }}
          >
            {pane.children}
          </div>
        </div>
      </div>
    </div>
  )
});
