import { useEffect } from "react";
import FunctionComponent from "../util/FunctionComponent";
import { registerTool, ToolConfig, toolIndex, ToolProps, useSubTool } from "../tools-framework/tools";

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
        <div>
          <FunctionComponent f={input1.view} ifMissing={<span>missing input 1 view</span>}/>
          <span style={{margin: 15, fontSize: "150%"}}>{config.op}</span>
          <FunctionComponent f={input2.view} ifMissing={<span>missing input 2 view</span>}/>
        </div>
      );
    })
    return () => reportView.set(null);
  }, [config.op, reportView, input1.view, input2.view]);

  return <>
    {input1.component}
    {input2.component}
  </>
}
registerTool(BinOpTool, {
  toolName: 'bin-op',
  input1Config: toolIndex['picker'].defaultConfig,
  input2Config: toolIndex['picker'].defaultConfig,
  op: '+'
});