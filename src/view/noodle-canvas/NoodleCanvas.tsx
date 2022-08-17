import { memo } from "react";
import { Pane } from "./model";
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
  updatePaneById: (id: string, f: (old: Pane) => Pane) => void,
}

export const NoodleCanvas = memo(function NoodleCanvas(props: NoodleCanvasProps) {
  const { panes, updatePaneById } = props;

  return (
    <div
      style={{
        backgroundColor: 'rgb(240, 240, 240)',
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      }}
    >
      <style>
        {['grabbing', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize'].map(cursor =>
          `.cursor-${cursor} * { cursor: ${cursor} !important; }`
        )}
      </style>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAkSURBVHgB7cNBCQAwDASwY/4FnbuVqugngaTt3znyAgAAABwbwdUGUUuAs94AAAAASUVORK5CYII=)',
        backgroundRepeat: 'repeat',
        backgroundSize: '16px 16px',
      }} />
      {panes.map(pane =>
        <PaneView
          pane={pane}
          updatePaneById={updatePaneById}
        />
      )}
    </div>
  )
});
