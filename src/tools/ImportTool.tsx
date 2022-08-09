import { memo, useCallback, useEffect, useState } from "react";
import { registerTool, ToolProgram, ToolProps, ToolValue, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import ControlledTextInput from "src/util/ControlledTextInput";
import { useAt } from "src/util/state";

export interface ImportProgram extends ToolProgram {
  toolName: 'import';
  name: string;
}

export const ImportTool = memo(function ImportTool({ program, updateProgram, reportOutput, reportView }: ToolProps<ImportProgram>) {
  const [result, setResult] = useState<ToolValue | null>(null);

  const [name, updateName] = useAt(program, updateProgram, 'name');

  // TODO: all sorts of caching, error detection, etc
  // package search
  // automatic .default?

  const sendRequest = useCallback(async () => {
    // TODO: The `import` below doesn't work in lib2 output. Ugh.
    const url = `https://cdn.skypack.dev/${name}`;
    const result = await import(/*webpackIgnore: true*/ url);
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

  const view: ToolView = useCallback(() => (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>name</b> <ControlledTextInput value={name} onChange={(ev) => updateName(() => ev.target.value)} />
      </div>
      <button onClick={sendRequest}>import</button>
    </div>
  ), [name, sendRequest, updateName]);
  useView(reportView, view);

  return <></>;
});
registerTool(ImportTool, 'import', {
  toolName: 'import',
  name: 'lodash',
});
