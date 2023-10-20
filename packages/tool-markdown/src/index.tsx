/// <reference path="./jsx-runtime.d.ts" />
import { markdown } from "@codemirror/lang-markdown";
import { FancyCodeEditor, hookFancyCodeEditor, refREDirect, collectReferencesForFancyCodeEditor } from "@engraft/codemirror-helpers";
import { CollectReferences, EngraftPromise, MakeProgram, ToolProgram, ToolProps, ToolView, UseUpdateProxy, defineTool, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";

export type Program = {
  toolName: 'markdown',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'markdown',
  code: '',
  subPrograms: {},
});

const collectReferences: CollectReferences<Program> = (program) =>
  collectReferencesForFancyCodeEditor(program.code, program.subPrograms);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings });

  const mdxCode = hookMemo(() => {
    return program.code.replaceAll(refREDirect, (ref) => `props.${ref}`);
  }, [program.code]);

  const mdxCompiledP = hookMemo(() => {
    console.log('mdxCode', mdxCode);
    return evaluate(mdxCode, {...runtime});
  }, [mdxCode]);

  const outputP = hookMemo(() => EngraftPromise.all(referenceValuesP, mdxCompiledP).then(([referenceValues, mdxCompiled]) => {
    return {value: mdxCompiled.default(referenceValues)};
  }), [mdxCompiledP, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus, onBlur}) =>
      <UseUpdateProxy updater={updateProgram} children={programUP =>
        <FancyCodeEditor
          extensions={[markdown()]}
          code={program.code}
          codeUP={programUP.code}
          subPrograms={program.subPrograms}
          subProgramsUP={programUP.subPrograms}
          varBindings={varBindings}
          autoFocus={autoFocus}
          subResults={subResults}
          defaultCode=""
          onBlur={onBlur}
        />
      } />
    }), [program.code, program.subPrograms, subResults, varBindings]);

  return {outputP, view};
}));

export default defineTool({ name: 'markdown', makeProgram, collectReferences, run })
