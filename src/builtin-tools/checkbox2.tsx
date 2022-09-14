import { memo, useMemo } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";

export type Program = {
  toolName: 'checkbox2';
  checked: boolean;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'checkbox2',
  checked: false,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [checked, updateChecked] = useAt(program, updateProgram, 'checked');

  useOutput(reportOutput, useMemo(() => ({
    value: checked
  }), [checked]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          updateChecked((checked) => !checked)
        }}
      />
  }), [checked, updateChecked]));

  return <></>;
});
