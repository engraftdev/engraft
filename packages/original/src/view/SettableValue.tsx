import { PromiseState, ToolOutput } from "@engraft/core";
import { memo, useCallback, useMemo, useState } from "react";
import { slotWithCode } from "../builtin-tools/slot";
import { Setter } from "../util/immutable";
import { useStateSetOnly, useStateUpdateOnly } from "../util/immutable-react";
import { empty } from "../util/noOp";
import { ToolWithView } from "./ToolWithView";
import { Value } from "./Value";

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

  const [entryProgram, updateEntryProgram] = useStateUpdateOnly(() => slotWithCode(''))
  const [entryOutputState, setEntryOutputState] = useStateSetOnly<PromiseState<ToolOutput> | null>(() => null)

  const onClickSet = useCallback(() => {
    if (entryOutputState?.status === 'fulfilled') {
      setValue(entryOutputState.value.value);
    }
  }, [entryOutputState, setValue]);

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
          <ToolWithView program={entryProgram} updateProgram={updateEntryProgram} reportOutputState={setEntryOutputState} varBindings={empty}/>
          <button disabled={entryOutputState === null} onClick={onClickSet}>set</button>
        </>
      }
    </div>
  );
});
