import { memo, useCallback, useMemo } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";

export type Program = {
  toolName: 'checkbox';
  checked: boolean;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'checkbox',
  checked: false,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [checked, updateChecked] = useAt(program, updateProgram, 'checked');

  const output = useMemo(() => {
    return {toolValue: checked};
  }, [checked])
  useOutput(reportOutput, output);

  const view = useCallback(() => {
    return <input
      type="checkbox"
      checked={checked}
      onChange={() => {
        updateChecked((checked) => !checked)
      }}
    />;
  }, [checked, updateChecked]);
  useView(reportView, view);

  return <></>;
});
