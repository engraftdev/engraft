/// <reference path="./jsx-runtime.d.ts" />
import { markdown } from "@codemirror/lang-markdown";
import { FancyCodeEditor, collectReferencesForFancyCodeEditor, hookFancyCodeEditor, refREDirect } from "@engraft/codemirror-helpers";
import { CollectReferences, EngraftPromise, MakeProgram, ToolProgram, ToolProps, ToolView, defineTool, hookMemo, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";
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
  const { program, varBindings, context } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings, context });

  const mdxCode = hookMemo(() => {
    return program.code.replaceAll(refREDirect, (ref) => `props.${ref}`);
  }, [program.code]);

  const mdxCompiledP = hookMemo(() => {
    return evaluate(mdxCode, {...runtime});
  }, [mdxCode]);

  const outputP = hookMemo(() => EngraftPromise.all(referenceValuesP, mdxCompiledP).then(([referenceValues, mdxCompiled]) => {
    return {value: mdxCompiled.default(referenceValues)};
  }), [mdxCompiledP, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus, onBlur}) =>
      <FancyCodeEditor
        extensions={[markdown()]}
        code={program.code}
        codeUP={up(updateProgram).code}
        subPrograms={program.subPrograms}
        subProgramsUP={up(updateProgram).subPrograms}
        varBindings={varBindings}
        autoFocus={autoFocus}
        subResults={subResults}
        defaultCode=""
        onBlur={onBlur}
        context={context}
      />
    ),
  }), [context, program.code, program.subPrograms, subResults, varBindings]);

  return {outputP, view};
}));

export default defineTool({ name: 'markdown', makeProgram, collectReferences, run })
