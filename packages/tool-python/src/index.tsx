/// <reference path="./index.d.ts" />

import { python } from "@codemirror/lang-python";
import { FancyCodeEditor, collectReferencesForFancyCodeEditor, hookFancyCodeEditor } from "@engraft/codemirror-helpers";
import { getPyodide } from "@engraft/pyodide";
import { CollectReferences, MakeProgram, ToolProgram, ToolProps, ToolView, defineTool, hookMemo, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";

export type Program = {
  toolName: 'python',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'python',
  code: '',
  subPrograms: {},
});

const collectReferences: CollectReferences<Program> = (program) =>
  collectReferencesForFancyCodeEditor(program.code, program.subPrograms);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings, context });

  const outputP = hookMemo(() => referenceValuesP.then((referenceValues) => {
    return runPython(program.code, referenceValues).then((value) => {
      return {value: value};
    });
  }), [program.code, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus}) =>
      <FancyCodeEditor
        extensions={[python()]}
        code={program.code}
        codeUP={up(updateProgram).code}
        subPrograms={program.subPrograms}
        subProgramsUP={up(updateProgram).subPrograms}
        varBindings={varBindings}
        autoFocus={autoFocus}
        subResults={subResults}
        defaultCode=""
        context={context}
      />
    ),
  }), [context, program.code, program.subPrograms, subResults, varBindings]);

  return {outputP, view};
}));

export default defineTool({ name: 'python', makeProgram, collectReferences, run })

async function runPython(code: string, globals: {[key: string]: any}) {
  const pyodide = await getPyodide();
  const originalConsoleLog = console.log;
  console.log = () => {};
  await pyodide.loadPackagesFromImports(code);
  const result = await pyodide.runPythonAsync(
    code,
    {globals: pyodide.toPy(globals)}
  );
  console.log = originalConsoleLog;
  // if (result?.toJs) return result.toJs();
  return result;
}
