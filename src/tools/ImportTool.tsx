import { memo, useCallback, useEffect, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolViewRender } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";
import ControlledTextInput from "../util/ControlledTextInput";
import { useAt } from "../util/state";

export interface ImportConfig extends ToolConfig {
  toolName: 'import';
  name: string;
}

export const ImportTool = memo(function ImportTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ImportConfig>) {
  const [result, setResult] = useState<ToolValue | null>(null);

  const [name, updateName] = useAt(config, updateConfig, 'name');

  // TODO: all sorts of caching, error detection, etc
  // package search
  // automatic .default?

  const sendRequest = useCallback(async () => {
    const result = await import(/*webpackIgnore: true*/ `https://cdn.skypack.dev/${name}`);
    setResult({toolValue: result});
  }, [name]);

  // special: run when loaded
  // TODO: think about this
  useEffect(() => {
    if (name.length > 0) {
      sendRequest();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useOutput(reportOutput, result);

  const render: ToolViewRender = useCallback(() => {
    return (
      <div style={{padding: 10}}>
        <div className="row-top" style={{marginBottom: 10}}>
          <b>name</b> <ControlledTextInput value={name} onChange={(ev) => updateName(() => ev.target.value)} />
        </div>
        <button onClick={sendRequest}>import</button>
      </div>
    );
  }, [name, sendRequest, updateName]);
  useView(reportView, render, config);

  return <></>;
});
registerTool(ImportTool, 'import', {
  toolName: 'import',
  name: 'lodash',
});
