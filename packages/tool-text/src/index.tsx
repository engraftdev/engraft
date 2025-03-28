import { FancyCodeEditor, collectReferencesForFancyCodeEditor, hookFancyCodeEditor } from "@engraft/codemirror-helpers";
import { CollectReferences, MakeProgram, ToolProgram, ToolProps, ToolView, defineTool, hookMemo, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";

export type Program = {
  toolName: 'text',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'text',
  code: '',
  subPrograms: {},
});

const collectReferences: CollectReferences<Program> = (program) =>
  collectReferencesForFancyCodeEditor(program.code, program.subPrograms);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings, context });

  const outputP = hookMemo(() => referenceValuesP.then((referenceValues) => {
    let code = program.code;
    for (const [key, value] of Object.entries(referenceValues)) {
      code = code.replaceAll(key, () => `${value}`);
    }
    return {value: code};
  }), [program.code, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact(({updateProgram, autoFocus}) =>
      <FancyCodeEditor
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

export default defineTool({ name: 'text', makeProgram, collectReferences, run })
