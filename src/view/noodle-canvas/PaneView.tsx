import { memo, useCallback } from "react";
import { updateF } from "src/util/updateF";
import { useRefForCallback } from "src/util/useRefForCallback";


import { Pane, roundTo } from "./model";
import { PaneResizers } from "./PaneResizers";

export type PaneViewProps = {
  pane: Pane,
  updatePaneById: (id: string, f: (old: Pane) => Pane) => void,
}

export const PaneView = memo(function Pane(props: PaneViewProps) {
  const { pane, updatePaneById } = props;
  const paneRef = useRefForCallback(pane);

  const onMouseDownDrag = useCallback((startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const startPane = paneRef.current;

    const onMousemove = (currentEvent: MouseEvent) => {
      const newX = roundTo(startPane.x + currentEvent.clientX - startEvent.clientX, 16);
      const newY = roundTo(startPane.y + currentEvent.clientY - startEvent.clientY, 16);
      updatePaneById(pane.id, updateF({
        x: {$set: newX}, y: {$set: newY},
      }));
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      document.body.classList.remove('cursor-grabbing');
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    document.body.classList.add('cursor-grabbing');
  }, [pane.id, paneRef, updatePaneById]);

  return (
    <div
      key={pane.id}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${pane.x}px, ${pane.y}px)`,
      }}
    >
      <div
        style={{
          width: pane.width,
          height: pane.height,
          backgroundColor: 'rgb(255, 255, 255)',
          borderRadius: '0.25rem',
          boxShadow: '0 0 #0000,0 0 #0000,0 1px 16px 0 rgba(0, 0, 0, .12)'
        }}
      >
        <PaneResizers {...props} />
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
            }}
            onMouseDown={onMouseDownDrag}
          >
            {pane.id}
          </div>
        </div>
      </div>
    </div>
  )
});
