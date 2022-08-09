import { memo, useCallback, useState } from "react";
import { ToolValue } from "src/tools-framework/tools";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { codeProgramSetTo } from "src/builtin-tools/code";
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

  const [entryProgram, updateEntryProgram] = useStateUpdateOnly(codeProgramSetTo(''))
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
          <ToolWithView program={entryProgram} updateProgram={updateEntryProgram} reportOutput={setEntryOutput}/>
          <button disabled={entryOutput === null} onClick={onClickSet}>set</button>
        </>
      }
    </div>
  );
});
