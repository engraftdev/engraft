import { memo, useMemo, useCallback } from "react";
import { registerTool, ToolConfig, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";

export interface CheckboxConfig extends ToolConfig {
  toolName: 'checkbox';
  checked: boolean;
}

export const AdderTool = memo(function AdderTool(props: ToolProps<CheckboxConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [checked, updateChecked] = useAt(config, updateConfig, 'checked');

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

registerTool<CheckboxConfig>(AdderTool, 'checkbox', () => ({
  toolName: 'checkbox',
  checked: false,
}));
