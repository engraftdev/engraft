import { memo, useCallback, useMemo } from "react";
import { newVarConfig, registerTool, ToolConfig, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { codeConfigSetTo } from "./CodeTool";

export interface AdderConfig extends ToolConfig {
  toolName: 'adder';
  aConfig: ToolConfig;
  bConfig: ToolConfig;
}

export const AdderTool = memo(function AdderTool({ config, updateConfig, reportOutput, reportView }: ToolProps<AdderConfig>) {
  const [aComponent, aView, aOutput] = useSubTool({config, updateConfig, subKey: 'aConfig'});
  const [bComponent, bView, bOutput] = useSubTool({config, updateConfig, subKey: 'bConfig'});

  const output = useMemo(() => {
    if (aOutput && bOutput) {
      return {toolValue: (aOutput.toolValue as any) + (bOutput.toolValue as any)};
    }
  }, [aOutput, bOutput])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback(({autoFocus}) => (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>a</b>
        <ShowView view={aView} autoFocus={autoFocus} />
      </div>

      <div className="xRow xGap10">
        <b>b</b>
        <ShowView view={bView} />
      </div>
    </div>
  ), [aView, bView]);
  useView(reportView, view);

  return <>
    {aComponent}
    {bComponent}
  </>
});

registerTool<AdderConfig>(AdderTool, 'adder', () => ({
  toolName: 'adder',
  bindingVar: newVarConfig(),
  aConfig: codeConfigSetTo(''),
  bConfig: codeConfigSetTo(''),
}));
