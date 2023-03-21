import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { startDrag } from "@engraft/original/lib/util/drag.js";
import { clientPtRel, Matrix } from "@engraft/original/lib/util/geom.js";
import { Pane, PaneGeo } from "./model.js";
import { PaneView } from "./PaneView.js";

// todo:
// [x] display panes
// [x] cute background
// [x] move & resize panes
//   [x] discretized
// [x] notebook
// [x] pan canvas
// [x] zoom canvas
// [ ] "selection", z-index, etc.
// [ ] noodle inputs


export type NoodleCanvasProps = {
  panes: Pane[],
  updatePaneGeoById: (id: string, f: (old: PaneGeo) => PaneGeo) => void,
  minWidth?: number,
  minHeight?: number,
}

export const NoodleCanvas = memo(function NoodleCanvas(props: NoodleCanvasProps) {
  const { panes, updatePaneGeoById, minWidth, minHeight } = props;

  const [viewMatrix, setViewMatrix] = useState(
    Matrix.naturalConstruct(0, 0, 1, 1, 0)
  );

  const onWheel = useCallback((ev: WheelEvent) => {
    const scale = Math.exp(-ev.deltaY / 300);
    const mousePx = clientPtRel(ev);
    setViewMatrix((oldViewMatrix) =>
      Matrix.seq(
        oldViewMatrix,
        Matrix.scale(scale).atPoint(mousePx)
      )
    );
    ev.preventDefault();
  }, []);
  const [panZoomTarget, setPanZoomTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    // we have to do this dance since React onWheel doesn't do the right passive event thingy
    if (!panZoomTarget) { return; }

    if (onWheel) {
      panZoomTarget.addEventListener('wheel', onWheel);
      return () => panZoomTarget.removeEventListener('wheel', onWheel);
    }
  }, [panZoomTarget, onWheel]);

  const onMouseDownDragCanvas = useMemo(() => startDrag({
    init() {
      return {startViewMatrix: viewMatrix};
    },
    move({startViewMatrix}) {
      setViewMatrix(() =>
        Matrix.seq(
          startViewMatrix,
          Matrix.translate(this.startDeltaX, this.startDeltaY)
        )
      );
    },
    done() {},
    cursor: "grabbing",
  }), [viewMatrix]);


  const origin = viewMatrix.fromLocal([0, 0]);
  const scale = viewMatrix.a;

  return (
    <div className="NoodleCanvas">
      <div
        ref={setPanZoomTarget}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgb(240, 240, 240)',
          backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAkSURBVHgB7cNBCQAwDASwY/4FnbuVqugngaTt3znyAgAAABwbwdUGUUuAs94AAAAASUVORK5CYII=)',
          backgroundRepeat: 'repeat',
          backgroundSize: `${16 * scale}px ${16 * scale}px`,
          backgroundPosition: `${origin[0]}px ${origin[1]}px`,
          touchAction: 'none',  // needed to capture scroll events properly
        }}
        onMouseDown={onMouseDownDragCanvas}
      />
      <div
        className="NoodleCanvas-transformed"
        style={{
          transform: viewMatrix.cssTransform(),
          transformOrigin: 'top left',
        }}
      >
        {panes.map(pane =>
          <PaneView
            key={pane.id}
            pane={pane}
            updatePaneGeoById={updatePaneGeoById}
            minWidth={minWidth}
            minHeight={minHeight}
            scale={scale}
          />
        )}
      </div>
    </div>
  )
});
