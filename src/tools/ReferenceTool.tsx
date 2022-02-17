import { useCallback, useContext, useMemo } from "react";
import { EnvContext, registerTool, ToolProps } from "../tools-framework/tools";
import { useOutput, useView } from "../tools-framework/useSubTool";


export interface ReferenceConfig {
  toolName: 'reference';
  referenceKey: string | undefined;
}
export function ReferenceTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ReferenceConfig>) {
  const env = useContext(EnvContext);

  const output = useMemo(() => {
    if (config.referenceKey && config.referenceKey in env) {
      return env[config.referenceKey];
    } else {
      return {toolValue: undefined};
    }
  }, [config.referenceKey, env]);
  useOutput(reportOutput, output);

  const render = useCallback(() => {
    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const referenceKey = e.target.value;
      updateConfig((o) => ({ ...o, referenceKey: referenceKey || undefined }))
    }

    return (
      <div>
        <div style={{display: 'inline-block', borderRadius: 36, border: '1px solid black', backgroundColor: 'lightblue'}}>
          <select onChange={onChange} style={{border: 'none', background: 'none'}}>
            { !config.referenceKey &&
              <option>
                pick a reference
              </option>
            }
            {Object.keys(env).map((contextKey) =>
              <option key={contextKey}>
                {contextKey}
              </option>
            )}
          </select>
        </div>
        { config.referenceKey &&
          <span style={{opacity: 0.5}}>
            {' '}= {JSON.stringify(output.toolValue)}
          </span>
        }
      </div>
    );
  }, [config.referenceKey, env, output.toolValue, updateConfig]);
  useView(reportView, render, config);

  return null;
}
registerTool(ReferenceTool, {
  toolName: 'reference',
  referenceKey: undefined,
});
