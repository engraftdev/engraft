import { memo, useMemo } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { Setter, useAt, useSetter } from "src/util/state";
import { SettableValue } from "src/view/SettableValue";

// OK, for now we're making TRULY PERSISTENT STATE :O
// that means state values are persisted in the program
// that means they need to be JSONable (no functions, DOM elements, etc)

// other ideas include: initialize as undefined every time; some kinda configurable init

export type Program = {
  toolName: 'persistent-state';
  stateValue: any;
}

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: 'persistent-state',
    stateValue: undefined,
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [stateValue, updateStateValue] = useAt(program, updateProgram, 'stateValue')
  const setStateValue = useSetter(updateStateValue);

  // TODO: make sure state is serializable befoer you set it

  useOutput(reportOutput, useMemo(() => ({
    value: {get: stateValue, set: setStateValue}
  }), [setStateValue, stateValue]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <PersistentStateToolView stateValue={stateValue} setStateValue={setStateValue}/>
  }), [setStateValue, stateValue]));

  return null;
});


const PersistentStateToolView = memo(function PersistentStateToolView({stateValue, setStateValue}: {stateValue: any, setStateValue: Setter<any>}) {
  return (
    <div style={{padding: 10}}>
      <SettableValue value={stateValue} setValue={setStateValue}/>
    </div>
  );
})
