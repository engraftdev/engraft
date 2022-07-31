import { memo, useCallback, useEffect, useMemo } from "react";
import { registerTool, ToolConfig, ToolProps, ToolView } from "src/tools-framework/tools";
import { useView } from "src/tools-framework/useSubTool";
import { Setter, updaterToSetter, useAt, useStateSetOnly } from "src/util/state";
import { SettableValue } from "src/view/SettableValue";


export interface StateConfig extends ToolConfig {
  toolName: 'state';
  initialValue: any;
}

export const StateTool = memo(function StateTool({ config, updateConfig, reportOutput, reportView }: ToolProps<StateConfig>) {
  const [initialValue, updateInitialValue] = useAt(config, updateConfig, 'initialValue')
  const setInitialValue = useMemo(() => updaterToSetter(updateInitialValue), [updateInitialValue])

  const [stateValue, setStateValue] = useStateSetOnly(initialValue);

  // TODO: make sure state is serializable befoer you set it

  useEffect(() => {
    reportOutput({toolValue: {get: stateValue, set: setStateValue}});
  }, [reportOutput, setStateValue, stateValue])

  const view: ToolView = useCallback(({autoFocus}) => (
    <StateToolView
      stateValue={stateValue} setStateValue={setStateValue}
      initialValue={initialValue} setInitialValue={setInitialValue}
    />
  ), [initialValue, setInitialValue, setStateValue, stateValue]);
  useView(reportView, view);

  return null;
});
registerTool<StateConfig>(StateTool, 'state', () => ({
  toolName: 'state',
  initialValue: undefined
}));


type StateToolViewProps = {
  stateValue: any,
  setStateValue: Setter<any>,

  initialValue: any,
  setInitialValue: Setter<any>,
}

const StateToolView = memo(function StateToolView(props: StateToolViewProps) {
  const { stateValue, setStateValue, initialValue, setInitialValue } = props;

  return (
    <div style={{padding: 10}}>
      <SettableValue value={stateValue} setValue={setStateValue}/>
      <details>
        <summary>initial value...</summary>
        <SettableValue value={initialValue} setValue={setInitialValue}/>
      </details>
    </div>
  );
})
