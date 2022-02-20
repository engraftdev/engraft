import { useCallback, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";
import ControlledTextInput from "../util/ControlledTextInput";
import { useAt } from "../util/state";

export interface ImportConfig extends ToolConfig {
  toolName: 'import';
  name: string;
}

export function ImportTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ImportConfig>) {
  const [result, setResult] = useState<ToolValue | null>(null);

  const [name, updateName] = useAt(config, updateConfig, 'name');

  // TODO: all sorts of caching, error detection, etc

  // package search

  const sendRequest = useCallback(async () => {
    const result = await import(/*webpackIgnore: true*/ `https://cdn.skypack.dev/${name}`);
    setResult({toolValue: result});
  }, [name]);

  useOutput(reportOutput, result);

  const render = useCallback(() => {
    return (
      <div>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>name</b> <ControlledTextInput value={name} onChange={(ev) => updateName(() => ev.target.value)} />
        </div>
        <button onClick={sendRequest}>import</button>
      </div>
    );
  }, [name, sendRequest, updateName]);
  useView(reportView, render, config);

  return <></>;
}
registerTool(ImportTool, {
  toolName: 'import',
  name: 'lodash',
});