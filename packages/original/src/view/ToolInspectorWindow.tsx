import { memo } from "react";
import { references, ToolProgram, VarBindings } from "@engraft/core";
import { runtimeObjectId } from "../util/id.js";
import { Updater } from "../util/immutable.js";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { WindowPortal } from "../util/WindowPortal.js";
import IsolateStyles from "./IsolateStyles.js";
import { Value } from "./Value.js";
import { ValueEditable } from "./ValueEditable.js";

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
    </IsolateStyles>
  </WindowPortal>;
});
