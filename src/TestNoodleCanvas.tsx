import { memo, useCallback } from 'react';
import { useStateUpdateOnly } from './util/state';
import { updateF } from './util/updateF';
import { Pane } from './view/noodle-canvas/model';
import { NoodleCanvas } from './view/noodle-canvas/NoodleCanvas';

export const TestNoodleCanvas = memo(function TestNoodleCanvas() {
  const [panes, updatePanes] = useStateUpdateOnly<{[id: string]: Pane}>({
    'a': {
      id: 'a',
      x: 16,
      y: 16,
      width: 32,
      height: 32,
    },
    'b': {
      id: 'b',
      x: 16*5,
      y: 16,
      width: 32*2,
      height: 32*2,
    },
  });

  const updatePaneById = useCallback((id: string, f: (old: Pane) => Pane) => {
    updatePanes(updateF({[id]: f}));
  } , [updatePanes]);

  return (
    <div className="sizer" style={{width: 600, height: 600, position: 'relative'}}>
      <NoodleCanvas
        panes={Object.values(panes)}
        updatePaneById={updatePaneById}
      />
    </div>
  );
});
