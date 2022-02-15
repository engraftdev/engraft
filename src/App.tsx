import React, { useEffect } from 'react';
import { toolIndex, ToolValue, ToolWithView } from './tools-framework/tools';
import { PickerConfig } from './tools/PickerTool';
import useInitOnce from './util/useInitOnce';
import useStrictState from './util/useStrictState';

import './tools/builtInTools';
import { CodeConfig } from './tools/CodeTool';

/*
TODO: fix remounting text-editor bug
*/


const localStorageKey = 'live-compose-v1';

const defaultConfig: CodeConfig = {
  toolName: 'code',
  type: 'text',
  text: ''
};

function App() {
  const [config, setConfig] = useStrictState<any>(defaultConfig)
  const [output, setOutput] = useStrictState<ToolValue | null>(null);
  const context = useInitOnce(() => ({array: {toolValue: [1, 2, 3]}}));

  useEffect(() => {
    const configJson = window.localStorage.getItem(localStorageKey)
    if (configJson) {
        setConfig.set(JSON.parse(configJson));
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(localStorageKey, JSON.stringify(config));
  }, [config])

  return <>
    <div>
      <ToolWithView
          Tool={toolIndex[config.toolName]}
          context={context}
          config={config}
          reportConfig={setConfig}
          reportOutput={setOutput}
      />
    </div>
    <br/>
    <br/>
    <pre>{JSON.stringify(output?.toolValue, null, 2)}</pre>
    <br/>
    <br/>
    <button onClick={() => setConfig.set(defaultConfig)}>reset</button>
  </>
}

export default App;
