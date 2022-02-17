import { useEffect } from "react";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";
import { useSubTool } from "../tools-framework/useSubTool";

export interface BinOpConfig extends ToolConfig {
  toolName: 'bin-op';
  input1Config: ToolConfig;
  input2Config: ToolConfig;
  op: '+' | '*';
}

export function BinOpTool({ context, config, updateConfig, reportOutput, reportView }: ToolProps<BinOpConfig>) {
  const [input1Component, input1MakeView, input1Output] = useSubTool({context, config, updateConfig, subKey: 'input1Config'})
  const [input2Component, input2MakeView, input2Output] = useSubTool({context, config, updateConfig, subKey: 'input2Config'})

  useEffect(() => {
    if (input1Output && input2Output) {
      switch (config.op) {
        case '+':
          reportOutput({toolValue: (input1Output.toolValue as number) + (input2Output.toolValue as number)});
          return;
        case '*':
          reportOutput({toolValue: (input1Output.toolValue as number) * (input2Output.toolValue as number)});
          return;
      }
    }
  }, [config.op, input1Output, input2Output, reportOutput])

  useEffect(() => {
    reportView(() => {
      return (
        <div className="row-center">
          {input1MakeView({autoFocus: true})}
          <span style={{margin: 15, fontSize: "150%"}}>{config.op}</span>
          {input2MakeView({autoFocus: false})}
        </div>
      );
    })
    return () => reportView(null);
  }, [config.op, reportView, input1MakeView, input2MakeView]);

  return <>
    {input1Component}
    {input2Component}
  </>
}
registerTool(BinOpTool, {
  toolName: 'bin-op',
  input1Config: toolIndex['code'].defaultConfig,
  input2Config: toolIndex['code'].defaultConfig,
  op: '+'
});