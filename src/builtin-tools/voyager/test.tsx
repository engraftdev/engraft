import { memo, useEffect, useState } from 'react';
import * as libVoyager from "datavoyager";

import voyagerCss from './tools/VoyagerTool.css';

export const TestVoyager = memo(function TestVoyager() {
  const [container, setContainer] = useState<HTMLDivElement | null>();

    useEffect(() => {
      if (container) {
        const voyagerInstance = libVoyager.CreateVoyager(container, undefined as any, undefined as any);

        (window as any).voyagerInstance = voyagerInstance;

        voyagerInstance.onStateChange((state) => {
          console.log('state', state);
        })

        const datas: {[n: number]: {values: any}} = {
          0: {values: [
            {x: 10, y: 20},
            {x: 20, y: 30},
            {x: 30, y: 50},
          ]},
          1: {values: [
            {x: 10, y: 20, z: 100},
            {x: 20, y: 30, z: 100},
            {x: 30, y: 50, z: 100},
          ]},
        }

        let i = 0;

        function step() {
          voyagerInstance.updateData(datas[i % 2]);
          i++;
          setTimeout(step, 1000);
        }
        step();
      }
    }, [container]);

    return (
      <div className="xCol" style={{padding: 10, width: 800}}>
        <style>{voyagerCss}</style>
        <div ref={setContainer}/>
      </div>
    );
});
