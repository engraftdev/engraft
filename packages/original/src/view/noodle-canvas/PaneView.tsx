import { memo, useCallback, useMemo } from "react";
import { startDrag } from "../../util/drag.js";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { useRefForCallback } from "../../util/useRefForCallback.js";


import { Pane, PaneGeo, roundTo } from "./model.js";
import { PaneResizers } from "./PaneResizers.js";

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
  const geoUP = useUpdateProxy(updateGeo);

  const onMouseDownDragPane = useMemo(() => startDrag({
    init() {
      return {startGeo: geoRef.current};
    },
    move({startGeo}) {
      const newX = roundTo(startGeo.x + this.startDeltaX / scale, 16);
      const newY = roundTo(startGeo.y + this.startDeltaY / scale, 16);
      geoUP.x.$set(newX);
      geoUP.y.$set(newY);
    },
    done() {},
    cursor: "grabbing",
  }), [geoRef, scale, geoUP]);

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
          borderRadius: '0.25rem',
          ...!pane.transparent && {
            backgroundColor: 'rgb(255, 255, 255)',
            boxShadow: '0 0 #0000,0 0 #0000,0 1px 16px 0 rgba(0, 0, 0, .12)',
          },
        }}
      >
        <PaneResizers
          geo={pane.geo}
          geoUP={geoUP}
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
