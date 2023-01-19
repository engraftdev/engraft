import { memo, useCallback, useMemo, useState } from "react";
import { hasValue, ToolOutput } from "src/tools-framework/tools";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { slotSetTo } from "src/builtin-tools-disabled/slot";
import { Setter, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { Value } from "../../src/view/Value";
import { empty } from "src/util/noOp";

export type SettableValueProps = {
  value: any,
  setValue: Setter<any>,

  displayRaw?: boolean,
}

export const SettableValue = memo(function SettableValue(props: SettableValueProps) {
  const {value, setValue, displayRaw} = props;

  const [expanded, setExpanded] = useState(false);

  const onClickValue = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  const [entryProgram, updateEntryProgram] = useStateUpdateOnly(slotSetTo(''))
  const [entryOutput, setEntryOutput] = useStateSetOnly<ToolOutput | null>(null)

  const onClickSet = useCallback(() => {
    if (hasValue(entryOutput)) {
      setValue(entryOutput.value);
    }
  }, [entryOutput, setValue]);

  const valueDisplay = useMemo(() => {
    if (displayRaw) {
      try {
        return <pre>{JSON.stringify(value)}</pre>;
      } catch (e) {
        return <pre>[cannot stringify]</pre>;
      }
    } else {
      return <Value value={value} />;
    }
  }, [displayRaw, value]);

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      <div onClick={onClickValue}>
        {valueDisplay}
      </div>
      {expanded &&
        <>
          <div>←</div>
          <ToolWithView program={entryProgram} updateProgram={updateEntryProgram} reportOutput={setEntryOutput} varBindings={empty}/>
          <button disabled={entryOutput === null} onClick={onClickSet}>set</button>
        </>
      }
    </div>
  );
});
