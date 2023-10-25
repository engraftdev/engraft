import { runtimeObjectId } from "@engraft/shared/lib/runtimeObjectId.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { EngraftContext, IsolateStyles, ToolProgram, ToolViewContext, useUpdateProxy, Value, ValueEditable, VarBindings } from "@engraft/toolkit";
import { memo, useContext } from "react";
import { WindowPortal } from "./WindowPortal.js";

export type ToolInspectorWindowProps = {
  show: boolean,
  onClose: () => void,

  program: ToolProgram,
  updateProgram?: Updater<ToolProgram>,
  varBindings: VarBindings,
  context: EngraftContext,
}

export const ToolInspectorWindow = memo(function ToolInspector(props: ToolInspectorWindowProps) {
  const {program, updateProgram, varBindings, context, show, onClose} = props;
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
      <h3>Program {refId(program)}</h3>
      { updateProgram ?
        <ValueEditable value={program} updater={updateProgram}/> :
        <Value value={program}/>
      }
      <h3>Program updater {refId(updateProgram)}</h3>
      <h3>Reported references {refId(context.dispatcher.referencesForProgram(program))}</h3>
      <ul>
        { [...context.dispatcher.referencesForProgram(program)].map((ref) =>
          <li key={ref}><small><code>{ref}</code></small></li>
        ) }
      </ul>
      <h3>Variable bindings {refId(varBindings)}</h3>
      <Value value={varBindings}/>
      <h3>Scope variable bindings {refId(scopeVarBindings)}</h3>
      <Value value={scopeVarBindings}/>
    </IsolateStyles>
  </WindowPortal>;
});

function refId(value: any) {
  return <code
    style={{fontSize: 'small', verticalAlign: 'super'}}
  >
    {runtimeObjectId(value)}
  </code>;
}
