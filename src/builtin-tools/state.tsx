import { memo, useCallback, useEffect, useMemo } from "react";
import { ProgramFactory, ToolProps, ToolView } from "src/tools-framework/tools";
import { useView } from "src/tools-framework/useSubTool";
import { Setter, updaterToSetter, useAt, useStateSetOnly } from "src/util/state";
import { SettableValue } from "src/view/SettableValue";


export type Program = {
  toolName: 'state',
  initialValue: any,
}

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: 'state',
    initialValue: undefined,
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [initialValue, updateInitialValue] = useAt(program, updateProgram, 'initialValue')
  const setInitialValue = useMemo(() => updaterToSetter(updateInitialValue), [updateInitialValue])

  const [stateValue, setStateValue] = useStateSetOnly(initialValue);

  // TODO: make sure state is serializable befoer you set it

  useEffect(() => {
    reportOutput({toolValue: {get: stateValue, set: setStateValue}});
  }, [reportOutput, setStateValue, stateValue])

  const view: ToolView = useCallback(({autoFocus}) => (
    <View
      stateValue={stateValue} setStateValue={setStateValue}
      initialValue={initialValue} setInitialValue={setInitialValue}
    />
  ), [initialValue, setInitialValue, setStateValue, stateValue]);
  useView(reportView, view);

  return null;
});


type ViewProps = {
  stateValue: any,
  setStateValue: Setter<any>,

  initialValue: any,
  setInitialValue: Setter<any>,
}

const View = memo((props: ViewProps) => {
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
