import { memo, useMemo, useCallback } from "react";
import { registerTool, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";

export interface CheckboxProgram extends ToolProgram {
  toolName: 'checkbox';
  checked: boolean;
}

export const AdderTool = memo(function AdderTool(props: ToolProps<CheckboxProgram>) {
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

registerTool<CheckboxProgram>(AdderTool, 'checkbox', () => ({
  toolName: 'checkbox',
  checked: false,
}));
