import React from "react";
import { useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { ToolValue, ToolConfig, EnvContext, VarInfo } from "./tools-framework/tools";
import { ToolWithView } from "./tools-framework/ToolWithView";
import { codeConfigSetTo } from "./tools/CodeTool";
import { Setter, useStateSetOnly, useStateUpdateOnly } from "./util/state";
import Value from "./view/Value";

import './tools/builtInTools';

interface EmbedProps {
  reportOutput: Setter<ToolValue | null>;
  variables: {[name: string]: any} | undefined
  initialConfigJson: string | undefined;
}

export function EmbedComponent({variables, initialConfigJson, reportOutput}: EmbedProps) {
  const [config, updateConfig] = useStateUpdateOnly<ToolConfig>(codeConfigSetTo(''));
  useEffect(() => {
    if (!initialConfigJson) { return; }
    try {
      const initialConfig: ToolConfig = JSON.parse(initialConfigJson);
      updateConfig(() => initialConfig);
    } catch {}
  }, [initialConfigJson, updateConfig])

  const env = useMemo(() => {
    let env: {[id: string]: VarInfo} = {};
    Object.entries(variables || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      env[id] = {config: {id, label: name}, value: {toolValue: value}};
    });
    return env;
  }, [variables]);

  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null);

  useEffect(() => {
    reportOutput(output);
  }, [output, reportOutput])

  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly('');

  return <div>
    <Value value={output?.toolValue} style={{minHeight: 100}}/>
    <div>
      <EnvContext.Provider value={env}>
        <ToolWithView config={config} updateConfig={updateConfig} reportOutput={setOutput} autoFocus={true}/>
      </EnvContext.Provider>
    </div>
    <div className="bottom-stuff">
      <button className="button-add" onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(JSON.stringify(config)));
          setCopyPasteMessage('✅');
        } catch (e) {
          setCopyPasteMessage('❌' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Copy</button>
      {' '}
      {copyPasteMessage}
    </div>
  </div>;
}

export { default as React } from 'react';
export { default as ReactDOM } from 'react-dom';