import { memo } from "react";
import { Pane, PaneGeo } from "./model";
import { PaneView } from "./PaneView";

// todo:
// [x] display panes
// [x] cute background
// [x] move & resize panes
//   [x] discretized
// [ ] notebook
// [ ] pan canvas
// [ ] zoom canvas
// [ ] "selection", z-index, etc.


export type NoodleCanvasProps = {
  panes: Pane[],
  updatePaneGeoById: (id: string, f: (old: PaneGeo) => PaneGeo) => void,
  minWidth?: number,
  minHeight?: number,
}

export const NoodleCanvas = memo(function NoodleCanvas(props: NoodleCanvasProps) {
  const { panes, updatePaneGeoById, minWidth, minHeight } = props;

  return (
    <div
      style={{
        backgroundColor: 'rgb(240, 240, 240)',
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'hidden', // transform: 'scale(0.5)',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAkSURBVHgB7cNBCQAwDASwY/4FnbuVqugngaTt3znyAgAAABwbwdUGUUuAs94AAAAASUVORK5CYII=)',
        backgroundRepeat: 'repeat',
        backgroundSize: '16px 16px',
      }} />
      {panes.map(pane =>
        <PaneView
          key={pane.id}
          pane={pane}
          updatePaneGeoById={updatePaneGeoById}
          minWidth={minWidth}
          minHeight={minHeight}
        />
      )}
    </div>
  )
});
