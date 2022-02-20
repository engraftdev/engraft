import { useEffect, useMemo } from 'react';
import { EnvContext, newVarConfig, ToolConfig, ToolValue, VarInfo } from './tools-framework/tools';
import { ToolWithView } from './tools-framework/ToolWithView';

import './tools/builtInTools';
import { CodeConfig } from './tools/CodeTool';
import { ControlledSpan } from './util/ControlledTextInput';
import range from './util/range';
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

function varInfoObject(varInfos: VarInfo[]) {
  return Object.fromEntries(varInfos.map((varInfo) => [varInfo.config.id, varInfo]));
}

function App() {
  const [config, updateConfig] = useStateUpdateOnly<ToolConfig>(defaultConfig);
  const context = useMemo(() => varInfoObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {config: {id: 'IDarray000000', label: 'array'}, value: {toolValue: [1, 2, 3]}},
    {config: {id: 'IDrange000000', label: 'range'}, value: {toolValue: range}},
  ]), []);

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
