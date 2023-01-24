import { Inspector } from '@observablehq/inspector';
import { memo, useEffect, useState } from 'react';

import css from './ObservableInspector.css';

export type ObservableInspectorProps = {
  value: any,
}

export const ObservableInspector = memo(({value}: ObservableInspectorProps) => {
  const [elem, setElem] = useState<HTMLDivElement | null>(null);
  const [inspector, setInspector] = useState<Inspector | null>(null);

  useEffect(() => {
    setInspector(elem && new Inspector(elem))
  }, [elem]);

  useEffect(() => {
    if (inspector) {
      inspector.fulfilled(value);
    }
  }, [inspector, value])

  return <>
    <style>{css}</style>
    <div ref={setElem} />
  </>;
});
