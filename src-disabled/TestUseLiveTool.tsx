import { memo, useState } from 'react';
import App from './App';
import { useLiveTool } from './lib';
import { Value } from './view/Value';

const TestUseLiveTool = memo(function TestUseLiveTool() {
  const [input, setInput] = useState(0);
  const output = useLiveTool({input}, {defaultValue: undefined});

  const [showApp, setShowApp] = useState(false);

  return <div>
    <div>
      Input: <input
          type="range"
          value={input}
          onChange={(e) => setInput(+e.target.value)}
          min={0} max={100} step={1}/> <Value value={input}/>
    </div>
    <div>
      Output: <Value value={output}/>
    </div>
    <div style={{height: 300}}/>
    Show app? <input type="checkbox" checked={showApp} onChange={(e) => setShowApp(e.target.checked)} />
    { showApp &&
      <App/>
    }
  </div>
});

export default TestUseLiveTool;
