import { useEffect, useMemo } from 'react';
import { EnvContext, ToolConfig, ToolValue } from './tools-framework/tools';
import { ToolWithView } from './tools-framework/ToolWithView';

import './tools/builtInTools';
import { CodeConfig } from './tools/CodeTool';
import { useStateSetOnly, useStateUpdateOnly } from './util/state';

/*
TODO: fix remounting text-editor bug
*/


const localStorageKey = 'live-compose-v1';

const defaultConfig: CodeConfig = {
  toolName: 'code',
  mode: {
    modeName: 'text',
    text: ''
  }
};

function App() {
  const [config, updateConfig] = useStateUpdateOnly<ToolConfig>(defaultConfig);
  const context = useMemo(() => ({array: {toolValue: [1, 2, 3]}}), []);

  useEffect(() => {
    const configJson = window.localStorage.getItem(localStorageKey)
    if (configJson) {
        updateConfig(() => JSON.parse(configJson));
    }
  }, [updateConfig])

  useEffect(() => {
    window.localStorage.setItem(localStorageKey, JSON.stringify(config));
  }, [config])

  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null);

  return <>
    <div>
      <EnvContext.Provider value={context}>
        <ToolWithView config={config} updateConfig={updateConfig} reportOutput={setOutput} autoFocus={true}/>
      </EnvContext.Provider>
    </div>
    <br/>
    <br/>
    <pre>{JSON.stringify(output?.toolValue, null, 2)}</pre>
    <br/>
    <br/>
    <button onClick={() => updateConfig(() => defaultConfig)}>reset</button>
  </>
}

export default App;
