import { memo, useCallback, useMemo } from "react";
import { ProgramFactory, ToolProgram, ToolProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import ChalkEditor from "src/util/ChalkEditor";
import { compileExpression } from "src/util/compile";
import { useAt } from "src/util/state";
import { slotSetTo } from "./slot";

// TODO: Hacky headless reportOutput.

export interface Program {
  toolName: 'chalk';
  inputProgram: ToolProgram;
  code: string;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'chalk',
  inputProgram: slotSetTo(''),
  code: defaultCode,
});
const defaultCode = `function (x) {
  return x;
}`;

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  const [code, updateCode] = useAt(program, updateProgram, 'code');

  useOutput(reportOutput, useMemo(() => {
    try {
      const compiled = compileExpression(code);
      const f = compiled({}) as any;
      return { value: f(valueOrUndefined(inputOutput)) }
    } catch {
      return null;
    }
  }, [code, inputOutput]));

  const setCode = useCallback((code: string) => {
    return updateCode(() => code);
  }, [updateCode]);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div style={{padding: 10}}>
        <div className="ExtractorTool-input-row xRow" style={{marginBottom: 10, gap: 10}}>
          <span style={{fontWeight: 'bold'}}>input</span>
          <ShowView view={inputView} autoFocus={autoFocus} />
        </div>
        <ChalkEditor
          code={code}
          setCode={setCode}
          input={valueOrUndefined(inputOutput)}
        />
      </div>
  }), [code, inputOutput, inputView, setCode]));

  return <>
    {inputComponent}
  </>;
});
