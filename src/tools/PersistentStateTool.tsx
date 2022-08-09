import { memo, useCallback, useEffect } from "react";
import { registerTool, ToolProgram, ToolProps, ToolView } from "src/tools-framework/tools";
import { useView } from "src/tools-framework/useSubTool";
import { Setter, useAt, useSetter } from "src/util/state";
import { SettableValue } from "src/view/SettableValue";

export interface PersistentStateProgram extends ToolProgram {
  toolName: 'persistent-state';
  stateValue: any;
}

// OK, for now we're making TRULY PERSISTENT STATE :O
// that means state values are persisted in the program
// that means they need to be JSONable (no functions, DOM elements, etc)

// other ideas include: initialize as undefined every time; some kinda configurable init

export const PersistentStateTool = memo(function PersistentStateTool({ program, updateProgram, reportOutput, reportView }: ToolProps<PersistentStateProgram>) {
  const [stateValue, updateStateValue] = useAt(program, updateProgram, 'stateValue')
  const setStateValue = useSetter(updateStateValue);

  // TODO: make sure state is serializable befoer you set it

  useEffect(() => {
    reportOutput({toolValue: {get: stateValue, set: setStateValue}});
  }, [reportOutput, setStateValue, stateValue])

  const view: ToolView = useCallback(({autoFocus}) => (
    <PersistentStateToolView stateValue={stateValue} setStateValue={setStateValue}/>
  ), [setStateValue, stateValue]);
  useView(reportView, view);

  return null;
});
registerTool<PersistentStateProgram>(PersistentStateTool, 'persistent-state', () => ({
  toolName: 'persistent-state',
  stateValue: undefined
}));


const PersistentStateToolView = memo(function PersistentStateToolView({stateValue, setStateValue}: {stateValue: any, setStateValue: Setter<any>}) {
  return (
    <div style={{padding: 10}}>
      <SettableValue value={stateValue} setValue={setStateValue}/>
    </div>
  );
})
