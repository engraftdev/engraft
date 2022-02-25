import { useEffect, useMemo, useState } from 'react';
import { EnvContext, ToolConfig, ToolValue, VarInfo } from './tools-framework/tools';
import { ToolWithView } from './tools-framework/ToolWithView';

import './tools/builtInTools';
import { CodeConfig, codeConfigSetTo } from './tools/CodeTool';
import range from './util/range';
import { useStateSetOnly, useStateUpdateOnly } from './util/state';
import Value, { ValueOfTool } from './view/Value';

import appCss from './App.css';

/*
TODO: fix remounting text-editor bug
*/


const localStorageKey = 'live-compose-v1';

const defaultConfig: CodeConfig = codeConfigSetTo('');

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
  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly('');
  const [hideTool, setHideTool] = useStateSetOnly(false);
  const [hideOutput, setHideOutput] = useStateSetOnly(true);

  return <>
    <style>
      {appCss}
    </style>
    <div style={hideTool ? {display: 'none'} : {}}>
      <EnvContext.Provider value={context}>
        <ToolWithView config={config} updateConfig={updateConfig} reportOutput={setOutput} autoFocus={true}/>
      </EnvContext.Provider>
    </div>
    <br/>
    <br/>
    {!hideOutput && <ValueOfTool toolValue={output} />}
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
    </div>
    <br/>
    <button onClick={() => setHideTool(!hideTool)}>{hideTool ? 'Show tool' : 'Hide tool'}</button>
    <button onClick={() => setHideOutput(!hideOutput)}>{hideOutput ? 'Show output' : 'Hide output'}</button>
  </>
}

export default App;
