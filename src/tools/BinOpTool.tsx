import { useEffect } from "react";
import FunctionComponent from "../util/CallFunction";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";
import { useSubTool } from "../tools-framework/useSubTool";

export interface BinOpConfig extends ToolConfig {
  toolName: 'bin-op';
  input1Config: ToolConfig;
  input2Config: ToolConfig;
  op: '+' | '*';
}

export function BinOpTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<BinOpConfig>) {
  const input1 = useSubTool({context, config, reportConfig, subKey: 'input1Config'})
  const input2 = useSubTool({context, config, reportConfig, subKey: 'input2Config'})

  useEffect(() => {
    if (input1.value && input2.value) {
      switch (config.op) {
        case '+':
          reportOutput.set({toolValue: (input1.value.toolValue as number) + (input2.value.toolValue as number)});
          return;
        case '*':
          reportOutput.set({toolValue: (input1.value.toolValue as number) * (input2.value.toolValue as number)});
          return;
      }
    }
  }, [config.op, input1.value, input2.value, reportOutput])

  useEffect(() => {
    reportView.set(() => {
      return (
        <div className="row-center">
          {input1.makeView({autoFocus: true})}
          <span style={{margin: 15, fontSize: "150%"}}>{config.op}</span>
          {input2.makeView({autoFocus: false})}
        </div>
      );
    })
    return () => reportView.set(null);
  }, [config.op, reportView, input1.makeView, input2.makeView]);

  return <>
    {input1.component}
    {input2.component}
  </>
}
registerTool(BinOpTool, {
  toolName: 'bin-op',
  input1Config: toolIndex['code'].defaultConfig,
  input2Config: toolIndex['code'].defaultConfig,
  op: '+'
});