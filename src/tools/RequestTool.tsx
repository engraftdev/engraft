import { useCallback, useEffect, useState } from "react";
import FunctionComponent from "../util/FunctionComponent";
import { registerTool, ToolConfig, toolIndex, ToolProps, useSubTool } from "../tools-framework/tools";
import { setKeys } from "../util/setKeys";

export interface RequestConfig extends ToolConfig {
  toolName: 'request';
  url: string;  // TODO: subtool! default text-editor
  paramsCode: string;
}

function tryEval(code: string) {
  try {
    return eval('(' + code + ')');
  } catch {
    return undefined;
  }
}


export function RequestTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<RequestConfig>) {
  const [response, setResponse] = useState<any>()

  const sendRequest = useCallback(async () => {
    const url = new URL(config.url);
    let params = tryEval(config.paramsCode) || {}
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, (v as any).toString()))
    const resp = await fetch(url.toString());
		const data: unknown = await resp.json();
    reportOutput.set({toolValue: data});
  }, [config.paramsCode, config.url, reportOutput]);

  useEffect(() => {
    reportView.set(() => {

      /* eslint-disable react-hooks/rules-of-hooks */
      useEffect(() => {
        console.log('RequestTool view mounts');

        return () => {
            console.log('RequestTool view unmounts')
        }
      }, []);
      /* eslint-enable react-hooks/rules-of-hooks */
      return (
        <div>
          <h2>request</h2>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>url</b> <input value={config.url} onChange={(ev) => reportConfig.update(setKeys({url: ev.target.value}))} />
          </div>
          <div className="row-top" style={{marginBottom: 10}}>
            <b>params</b> <textarea value={config.paramsCode} onChange={(ev) => reportConfig.update(setKeys({paramsCode: ev.target.value}))} />
          </div>
          <button onClick={sendRequest}>send</button>
        </div>
      );
    })
    return () => reportView.set(null);
  }, [sendRequest, reportView, config.url, config.paramsCode, reportConfig]);

  return null;
}
registerTool(RequestTool, {
  toolName: 'request',
  url: 'https://en.wikipedia.org/w/api.php',
  paramsCode: `{
  origin: '*',
  format: 'json',
  action: 'query',
  generator: 'random',
  grnnamespace: 0,
  // prop: 'revisions|images',
  rvprop: 'content',
  grnlimit: 1
}`
});