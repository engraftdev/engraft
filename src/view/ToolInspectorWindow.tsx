import { memo } from "react";
import { references, ToolProgram, VarBindings } from "src/engraft";
import { Updater } from "src/util/immutable";
import { updateF } from "src/util/updateF";
import { WindowPortal } from "src/util/WindowPortal";
import IsolateStyles from "./IsolateStyles";
import { Value } from "./Value";
import { ValueEditable } from "./ValueEditable";

export type ToolInspectorWindowProps = {
  show: boolean,
  onClose: () => void,

  program: ToolProgram,
  updateProgram?: Updater<ToolProgram>,
  varBindings: VarBindings,
}

export const ToolInspectorWindow = memo(function ToolInspector(props: ToolInspectorWindowProps) {
  const {program, updateProgram, varBindings, show, onClose} = props;

  if (!show) return null;

  return <WindowPortal
    title="Tool info"
    onClose={onClose}
  >
    <IsolateStyles>
      <div className="xRow xGap10">
        Debug ID
        { updateProgram ?
          <input
            value={program.debugId || ""}
            onChange={(e) => updateProgram(updateF({debugId: {$set: e.target.value.length > 0 ? e.target.value : undefined}}))}
          /> :
          <span>{(program as any).debugId}</span>
        }
      </div>
      <h3>Program</h3>
      { updateProgram ?
        <ValueEditable value={program} updater={updateProgram}/> :
        <Value value={program}/>
      }
      <h3>References</h3>
      <ul>
        { [...references(program)].map((ref) =>
          <li key={ref}>{ref}</li>
        ) }
      </ul>
      <h3>Variable bindings</h3>
      <Value value={varBindings}/>
    </IsolateStyles>
  </WindowPortal>;
});
