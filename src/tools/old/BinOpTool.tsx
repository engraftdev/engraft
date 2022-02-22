import { useCallback, useMemo } from "react";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../../tools-framework/useSubTool";

export interface BinOpConfig extends ToolConfig {
  toolName: 'bin-op';
  input1Config: ToolConfig;
  input2Config: ToolConfig;
  op: '+' | '*';
}

export function BinOpTool({ config, updateConfig, reportOutput, reportView }: ToolProps<BinOpConfig>) {
  const [input1Component, input1View, input1Output] = useSubTool({config, updateConfig, subKey: 'input1Config'})
  const [input2Component, input2View, input2Output] = useSubTool({config, updateConfig, subKey: 'input2Config'})

  const output = useMemo(() => {
    if (input1Output && input2Output) {
      switch (config.op) {
        case '+':
          return {toolValue: (input1Output.toolValue as number) + (input2Output.toolValue as number)};
        case '*':
          return {toolValue: (input1Output.toolValue as number) * (input2Output.toolValue as number)};
      }
    }
    return null;
  }, [config.op, input1Output, input2Output])
  useOutput(reportOutput, output)

  const render = useCallback(({autoFocus}) => {
    return (
      <div className="row-center">
        <ShowView view={input1View} autoFocus={autoFocus}/>
        <span style={{margin: 15, fontSize: "150%"}}>{config.op}</span>
        <ShowView view={input2View}/>
      </div>
    );
  }, [config.op, input1View, input2View]);
  useView(reportView, render, config);

  return <>
    {input1Component}
    {input2Component}
  </>
}
registerTool<BinOpConfig>(BinOpTool, () => ({
  toolName: 'bin-op',
  input1Config: toolIndex['code'].defaultConfig(),
  input2Config: toolIndex['code'].defaultConfig(),
  op: '+'
}));