import { runtimeObjectId } from "@engraft/shared/lib/runtimeObjectId.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { IsolateStyles, references, ToolProgram, ToolViewContext, useUpdateProxy, Value, ValueEditable, VarBindings } from "@engraft/toolkit";
import { memo, useContext } from "react";
import { WindowPortal } from "./WindowPortal.js";

export type ToolInspectorWindowProps = {
  show: boolean,
  onClose: () => void,

  program: ToolProgram,
  updateProgram?: Updater<ToolProgram>,
  varBindings: VarBindings,
}

export const ToolInspectorWindow = memo(function ToolInspector(props: ToolInspectorWindowProps) {
  const {program, updateProgram, varBindings, show, onClose} = props;
  const programUP = useUpdateProxy(updateProgram);

  const { scopeVarBindings } = useContext(ToolViewContext);

  if (!show) return null;

  return <WindowPortal
    title="Tool info"
    onClose={onClose}
  >
    <IsolateStyles>
      <div className="xRow xGap10">
        Debug ID
        { programUP ?
          <input
            value={program.debugId || ""}
            onChange={(e) => programUP.debugId.$set(e.target.value.length > 0 ? e.target.value : undefined)}
          /> :
          <span>{(program as any).debugId}</span>
        }
      </div>
      <h3>Program</h3>
      { updateProgram ?
        <ValueEditable value={program} updater={updateProgram}/> :
        <Value value={program}/>
      }
      <div><small>Object reference ID: <code>{runtimeObjectId(program)}</code></small></div>
      <h3>Program updater</h3>
      <div><small>Object reference ID: <code>{runtimeObjectId(updateProgram)}</code></small></div>
      <h3>References</h3>
      <ul>
        { [...references(program)].map((ref) =>
          <li key={ref}><small><code>{ref}</code></small></li>
        ) }
      </ul>
      <h3>Variable bindings</h3>
      <Value value={varBindings}/>
      <h3>Scope variable bindings</h3>
      <Value value={scopeVarBindings}/>
    </IsolateStyles>
  </WindowPortal>;
});
