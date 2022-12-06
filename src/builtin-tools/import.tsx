import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ProgramFactory, ToolOutput, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { ControlledTextInput } from "src/util/ControlledTextInput";
import { useAt } from "src/util/state";

export type Program = {
  toolName: 'import';
  name: string;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  return {
    toolName: 'import',
    name: 'lodash',
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [result, setResult] = useState<ToolOutput | null>(null);

  const [name, updateName] = useAt(program, updateProgram, 'name');

  // TODO: all sorts of caching, error detection, etc
  // package search
  // automatic .default?

  const sendRequest = useCallback(async () => {
    // TODO: The `import` below doesn't work in lib2 output. Ugh.
    // const url = `https://cdn.skypack.dev/${name}`;
    const url = `https://esm.sh/${name}`;
    const result = await import(/*webpackIgnore: true*/ url);
    setResult({value: result});
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

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>name</b> <ControlledTextInput value={name} onChange={(ev) => updateName(() => ev.target.value)} />
        </div>
        <button onClick={sendRequest}>import</button>
      </div>
  }), [name, sendRequest, updateName]));

  return <></>;
});
