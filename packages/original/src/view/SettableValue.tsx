import { PromiseState, slotWithCode, ToolOutput } from "@engraft/core";
import { Setter } from "@engraft/shared/lib/Updater.js";
import { useStateUP } from "@engraft/update-proxy-react";
import { memo, useCallback, useMemo, useState } from "react";
import { empty } from "../util/noOp.js";
import { ToolWithView } from "./ToolWithView.js";
import { Value } from "./Value.js";

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

  const [entryProgram, entryProgramUP] = useStateUP(() => slotWithCode(''))
  const [entryOutputState, entryOutputStateUP] = useStateUP<PromiseState<ToolOutput> | null>(() => null)

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
          <ToolWithView program={entryProgram} updateProgram={entryProgramUP.$} reportOutputState={entryOutputStateUP.$set} varBindings={empty}/>
          <button disabled={entryOutputState === null} onClick={onClickSet}>set</button>
        </>
      }
    </div>
  );
});
