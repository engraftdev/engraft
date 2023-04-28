import { FancyCodeEditor, hookFancyCodeEditor, referencesFancyCodeEditor } from "@engraft/codemirror-helpers";
import { ComputeReferences, ProgramFactory, ToolProgram, ToolProps, ToolView, UseUpdateProxy, defineTool, hookMemo, hooks, memoizeProps } from "@engraft/toolkit";

export type Program = {
  toolName: 'text',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'text',
  code: '',
  subPrograms: {},
});

const computeReferences: ComputeReferences<Program> = (program) =>
  referencesFancyCodeEditor(program.code, program.subPrograms);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings });

  const outputP = hookMemo(() => referenceValuesP.then((referenceValues) => {
    let code = program.code;
    for (const [key, value] of Object.entries(referenceValues)) {
      code = code.replaceAll(key, `${value}`);
    }
    return {value: code};
  }), [program.code, referenceValuesP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram, autoFocus}) =>
      <UseUpdateProxy updater={updateProgram} children={programUP =>
        <FancyCodeEditor
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
