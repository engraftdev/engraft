import { memo, useEffect, useMemo } from "react";
import { ComputeReferences, hasValue, ProgramFactory, references, ToolProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useStateSetOnly } from "src/util/state";
import { SettableValue } from "src/view/SettableValue";
import { slotSetTo } from "./slot";


export type Program = {
  toolName: 'state2',
  initialValueProgram: any,
}

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: 'state2',
    initialValueProgram: slotSetTo(''),
  };
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.initialValueProgram);

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView, varBindings } = props;

  const [stateValue, setStateValue] = useStateSetOnly<{value: unknown} | null>(null);

  const [initialValueComponent, initialValueView, initialValueOutput] = useSubTool({program, updateProgram, subKey: 'initialValueProgram', varBindings});
  useEffect(() => {
    if (!stateValue && hasValue(initialValueOutput)) {
      setStateValue({value: initialValueOutput.value});
    }
  }, [initialValueOutput, setStateValue, stateValue]);

  const set = useMemo(() => {
    return (value: unknown) => setStateValue({value});
  }, [setStateValue]);

  useOutput(reportOutput, useMemo(() => (stateValue && {
    value: {get: stateValue.value, set}
  }), [set, stateValue]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <div style={{padding: 10}}>
        <SettableValue value={stateValue?.value} setValue={(value) => setStateValue({value})}/>
        <details>
          <summary>initial value...</summary>
          <ShowView view={initialValueView}/>
          <button onClick={() => setStateValue({value: valueOrUndefined(initialValueOutput)})}>reset</button>
        </details>
      </div>
  }), [initialValueOutput, initialValueView, setStateValue, stateValue]));

  return <>
    {initialValueComponent}
  </>;
});