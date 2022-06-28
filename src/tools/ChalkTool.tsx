import { memo, useCallback, useMemo } from "react";
import { registerTool, ToolConfig, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import ChalkEditor from "src/util/ChalkEditor";
import { compileExpression } from "src/util/compile";
import { useAt } from "src/util/state";
import { codeConfigSetTo } from "./CodeTool";

// TODO: Hacky headless reportOutput.

export interface ChalkConfig {
  toolName: 'chalk';
  inputConfig: ToolConfig;
  code: string;
}
export const ChalkTool = memo(function ChalkTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ChalkConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [code, updateCode] = useAt(config, updateConfig, 'code');

  const output = useMemo(() => {
    try {
      const compiled = compileExpression(code);
      const f = compiled({}) as any;
      return { toolValue: f(inputOutput?.toolValue) }
    } catch {
      return null;
    }
  }, [code, inputOutput?.toolValue])
  useOutput(reportOutput, output);

  const setCode = useCallback((code: string) => {
    return updateCode(() => code);
  }, [updateCode]);

  const view: ToolView = useCallback(({autoFocus}) => (
    <div style={{padding: 10}}>
      <div className="ExtractorTool-input-row xRow" style={{marginBottom: 10, gap: 10}}>
        <span style={{fontWeight: 'bold'}}>input</span>
        <ShowView view={inputView} autoFocus={autoFocus} />
      </div>
      <ChalkEditor
        code={code}
        setCode={setCode}
        input={inputOutput?.toolValue}
      />
    </div>
  ), [code, inputOutput?.toolValue, inputView, setCode]);
  useView(reportView, view);

  return <>
    {inputComponent}
  </>;
});
const defaultCode = `function (x) {
  return x;
}`
registerTool(ChalkTool, 'chalk', {
  toolName: 'chalk',
  inputConfig: codeConfigSetTo(''),
  code: defaultCode
});
