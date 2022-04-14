import { memo, Reducer, useEffect, useMemo, useReducer, useState } from 'react';
import { EnvContext, ToolConfig, ToolValue, VarInfo } from './tools-framework/tools';
import { ToolWithView } from './tools-framework/ToolWithView';

import './tools/builtInTools';
import { CodeConfig, codeConfigSetTo } from './tools/CodeTool';
import range from './util/range';
import { useStateSetOnly, useStateUpdateOnly } from './util/state';
import { ValueOfTool } from './view/Value';

import appCss from './App.css';
import { examples } from './examples/examples';

/*
TODO: fix remounting text-editor bug
*/

const localStorageKey = 'live-compose-v1';

const defaultConfig: CodeConfig = codeConfigSetTo('');

function varInfoObject(varInfos: VarInfo[]) {
  return Object.fromEntries(varInfos.map((varInfo) => [varInfo.config.id, varInfo]));
}

const App = memo(function App() {
  const [config, updateConfig] = useStateUpdateOnly<ToolConfig>(defaultConfig);
  const [topLevelKey, incrementTopLevelKey] = useReducer<Reducer<number, undefined>>((i) => i + 1, 0);

  const context = useMemo(() => varInfoObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {config: {id: 'IDarray000000', label: 'array'}, value: {toolValue: [1, 2, 3]}},
    {config: {id: 'IDrange000000', label: 'range'}, value: {toolValue: range}},
  ]), []);

  useEffect(() => {
    const configJson = window.localStorage.getItem(localStorageKey)
    if (configJson) {
      updateConfig(() => JSON.parse(configJson));
      incrementTopLevelKey(undefined);
    }
  }, [updateConfig])

  useEffect(() => {
    try {
      if (config !== defaultConfig) {
        window.localStorage.setItem(localStorageKey, JSON.stringify(config));
      }
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [config])

  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null);
  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly('');
  const [showTool, setShowTool] = useStateSetOnly(true);
  const [showOutput, setShowOutput] = useStateSetOnly(false);

  return <>
    <style>
      {appCss}
    </style>
    <div style={{...!showTool && {display: 'none'}}}>
      <EnvContext.Provider value={context}>
        <ToolWithView key={topLevelKey} config={config} updateConfig={updateConfig} reportOutput={setOutput} autoFocus={true}/>
      </EnvContext.Provider>
    </div>
    <br/>
    <br/>
    {showOutput && <ValueOfTool toolValue={output} />}
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <div className="bottom-stuff">
      <button className="button-add" onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(config));
          setCopyPasteMessage('Copied successfully');
        } catch (e) {
          setCopyPasteMessage('Copy unsuccessful' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Copy to clipboard</button>
      {' '}
      <button className="button-add" onClick={async () => {
        try {
          const text = await navigator.clipboard.readText();
          updateConfig(() => JSON.parse(text));
          setCopyPasteMessage('Pasted successfully');
        } catch (e) {
          setCopyPasteMessage('Paste unsuccessful' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Paste from clipboard</button>
      {' '}
      {copyPasteMessage}
    </div>
    <br/>
    <div>
      <button onClick={() => updateConfig(() => defaultConfig)}>Reset</button>
      {' '}
      <select value='none' onChange={(ev) => {
          updateConfig(() => examples.find((ex) => ex.name === ev.target.value)!.config);
        }}>
        <option value='none' disabled={true}>Load example...</option>
        {examples.map(({name, config}) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select>
    </div>
    <br/>
    <div>
      <input type='checkbox' checked={showTool} onChange={(ev) => setShowTool(ev.target.checked)}/>
      <label>Show tool</label>
    </div>
    <div>
      <input type='checkbox' checked={showOutput} onChange={(ev) => setShowOutput(ev.target.checked)}/>
      <label>Show output</label>
    </div>
  </>
});

export default App;
