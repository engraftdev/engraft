import { memo, useMemo } from "react";
import { references, ProgramFactory, ComputeReferences, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";

export type Program = {
  toolName: 'checkbox';
  checked: boolean;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'checkbox',
  checked: false,
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  useOutput(reportOutput, useMemo(() => ({
    value: program.checked
  }), [program.checked]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <input
        type="checkbox"
        checked={program.checked}
        onChange={(e) => {
          updateProgram((old) => ({...old, checked: e.target.checked}))
        }}
      />
  }), [program.checked, updateProgram]));

  return <></>;
});
