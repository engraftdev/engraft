import { memo, useCallback, useState } from "react";
import { codeConfigSetTo, ToolValue, ToolWithView } from "src/lib";
import { Setter, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { Value } from "./Value";

export type SettableValueProps = {
  value: any,
  setValue: Setter<any>,
}

export const SettableValue = memo(function SettableValue(props: SettableValueProps) {
  const {value, setValue} = props;

  const [expanded, setExpanded] = useState(false);

  const onClickValue = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  const [entryConfig, updateEntryConfig] = useStateUpdateOnly(codeConfigSetTo(''))
  const [entryOutput, setEntryOutput] = useStateSetOnly<ToolValue | null>(null)

  const onClickSet = useCallback(() => {
    if (entryOutput) {
      setValue(entryOutput.toolValue);
    }
  }, [entryOutput, setValue]);

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      <div onClick={onClickValue}>
        <Value value={value} />
      </div>
      {expanded &&
        <>
          <div>←</div>
          <ToolWithView config={entryConfig} updateConfig={updateEntryConfig} reportOutput={setEntryOutput}/>
          <button disabled={entryOutput === null} onClick={onClickSet}>set</button>
        </>
      }
    </div>
  );
});
