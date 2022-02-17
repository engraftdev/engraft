import { useContext, useEffect } from "react";
import { EnvContext, registerTool, ToolProps } from "../tools-framework/tools";


export interface ReferenceConfig {
  toolName: 'reference';
  referenceKey: string | undefined;
}
export function ReferenceTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ReferenceConfig>) {
  const env = useContext(EnvContext);

  useEffect(() => {
    console.log("referencetool output");
    if (config.referenceKey) {
      reportOutput(env[config.referenceKey]);
    } else {
      reportOutput({toolValue: undefined});
    }
  }, [config.referenceKey, env, reportOutput]);  // TODO: avoid re-reports when other things change?
  // useWhatChanged([config.referenceKey, context, reportOutput], 'config.referenceKey, context, reportOutput')

  useEffect(() => {
    reportView(() => {
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
              {' '}= {JSON.stringify(env[config.referenceKey].toolValue)}
            </span>
          }
        </div>
      );
    })
  }, [reportView, updateConfig, env, config.referenceKey])

  return null;
}
registerTool(ReferenceTool, {
  toolName: 'reference',
  referenceKey: undefined,
});
