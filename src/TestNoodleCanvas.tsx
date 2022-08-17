import { memo, useCallback } from 'react';
import { useStateUpdateOnly } from './util/state';
import { updateF } from './util/updateF';
import { Pane, PaneGeo } from './view/noodle-canvas/model';
import { NoodleCanvas } from './view/noodle-canvas/NoodleCanvas';

export const TestNoodleCanvas = memo(function TestNoodleCanvas() {
  const [panes, updatePanes] = useStateUpdateOnly<{[id: string]: Pane}>({
    'a': {
      id: 'a',
      geo: {
        x: 16,
        y: 16,
        width: 16 * 12,
        height: 16 * 6,
      },
      heading: 'hi',
      children: <h1>hi</h1>
    },
    'b': {
      id: 'b',
      geo: {
        x: 16 * 5,
        y: 16 * 4,
        width: 16 * 12,
        height: 16 * 4,
      },
      heading: 'hello',
    },
  });

  const updatePaneGeoById = useCallback((id: string, f: (old: PaneGeo) => PaneGeo) => {
    updatePanes(updateF({[id]: {geo: f}}));
  } , [updatePanes]);

  return (
    <div className="sizer" style={{width: 600, height: 600, position: 'relative'}}>
      <NoodleCanvas
        panes={Object.values(panes)}
        updatePaneGeoById={updatePaneGeoById}
        minWidth={16 * 12}
        minHeight={16 * 4}
      />
    </div>
  );
});
