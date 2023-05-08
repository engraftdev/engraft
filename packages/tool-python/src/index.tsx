/// <reference path="./index.d.ts" />

import { FancyCodeEditor, hookFancyCodeEditor, referencesFancyCodeEditor } from "@engraft/codemirror-helpers";
import { ComputeReferences, ProgramFactory, ToolProgram, ToolProps, ToolView, UseUpdateProxy, defineTool, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";
import { python } from "@codemirror/lang-python";
import type { PyodideInterface } from "pyodide/pyodide.js";

export type Program = {
  toolName: 'python',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'python',
  code: '',
  subPrograms: {},
});

const computeReferences: ComputeReferences<Program> = (program) =>
  referencesFancyCodeEditor(program.code, program.subPrograms);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings });

  const outputP = hookMemo(() => referenceValuesP.then((referenceValues) => {
    return runPython(program.code, referenceValues).then((value) => {
      return {value: value};
    });
  }), [program.code, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={programUP =>
        <FancyCodeEditor
          extensions={[python()]}
          code={program.code}
          codeUP={programUP.code}
          subPrograms={program.subPrograms}
          subProgramsUP={programUP.subPrograms}
          varBindings={varBindings}
          autoFocus={autoFocus}
          subResults={subResults}
          defaultCode=""
        />
      } />
    }), [program.code, program.subPrograms, subResults, varBindings]);

  return {outputP, view};
}));

export default defineTool({ programFactory, computeReferences, run })


let _pyodide: PyodideInterface | undefined = undefined;

async function getPyodide() {
  if (_pyodide === undefined) {
    const process = (globalThis as any).process;
    const isNode = process && (process.release.name === 'node');
    const pyodideModule = isNode
      ? await import("pyodide/pyodide.js")
      : await import("https://cdn.jsdelivr.net/pyodide/v0.23.1/full/pyodide.mjs");
    _pyodide = await pyodideModule.loadPyodide() as PyodideInterface;
    await _pyodide.loadPackage("numpy");
  }
  return _pyodide;
}

async function runPython(code: string, globals: {[key: string]: any}) {
  const pyodide = await getPyodide();
  await pyodide.loadPackagesFromImports(code);
  const result = await pyodide.runPythonAsync(
    code,
    {globals: pyodide.toPy(globals)}
  );
  // if (result?.toJs) return result.toJs();
  return result;
}
