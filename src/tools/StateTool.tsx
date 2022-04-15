import { memo, useCallback, useEffect } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolView } from "../tools-framework/tools";
import { ToolWithView } from "../tools-framework/ToolWithView";
import { useView } from "../tools-framework/useSubTool";
import { Setter, useAt, useSetter, useStateSetOnly, useStateUpdateOnly } from "../util/state";
import { Value } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";

export interface StateConfig extends ToolConfig {
  toolName: 'state';
  stateValue: any;
}

// OK, for now we're making TRULY PERSISTENT STATE :O
// that means state values are persisted in the config
// that means they need to be JSONable (no functions, DOM elements, etc)

// other ideas include: initialize as undefined every time; some kinda configurable init

export const StateTool = memo(function StateTool({ config, updateConfig, reportOutput, reportView }: ToolProps<StateConfig>) {
  const [stateValue, updateStateValue] = useAt(config, updateConfig, 'stateValue')
  const setStateValue = useSetter(updateStateValue);

  // TODO: make sure state is serializable befoer you set it

  useEffect(() => {
    reportOutput({toolValue: {get: stateValue, set: setStateValue}});
  }, [reportOutput, setStateValue, stateValue])

  const view: ToolView = useCallback(({autoFocus}) => (
    <StateToolView stateValue={stateValue} setStateValue={setStateValue}/>
  ), [setStateValue, stateValue]);
  useView(reportView, view);

  return null;
});
registerTool<StateConfig>(StateTool, 'state', () => ({
  toolName: 'state',
  stateValue: undefined
}));


const StateToolView = memo(function StateToolView({stateValue, setStateValue}: {stateValue: any, setStateValue: Setter<any>}) {
  const [config, updateConfig] = useStateUpdateOnly(codeConfigSetTo(''))
  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null)

  return (
    <div style={{padding: 10}}>
      <Value value={stateValue}/>
      <details>
        <summary>set to...</summary>
        <ToolWithView config={config} updateConfig={updateConfig} reportOutput={setOutput}/>
        {output && <button onClick={() => setStateValue(output.toolValue)}>set</button>}
      </details>
    </div>
  );
})
