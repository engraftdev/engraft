import { memo, useRef, useState } from "react";
import { VarConfig, VarInfo } from "../tools-framework/tools";
import { ControlledSpan } from "../util/ControlledTextInput";
import { updateKeys, Updater } from "../util/state";
import rectConnect from 'rect-connect';
import { ObjectInspector } from "react-inspector";

(window as any).rectConnect = rectConnect;


interface VarDefinitionProps {
  varConfig: VarConfig,
  updateVarConfig: Updater<VarConfig>,
  autoFocus?: boolean,
}

export const VarDefinition = memo(function VarDefinition({varConfig, updateVarConfig, autoFocus}: VarDefinitionProps) {
  return <span className={`def-${varConfig.id}`}
    style={{ backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', border: '1px solid gray', fontSize: '13px', minHeight: '13px'}}>
    <ControlledSpan value={varConfig.label} onValue={(label) => updateKeys(updateVarConfig, {label})}
          style={{border: 'none', background: 'none'}} autoFocus={autoFocus}/>
    {varConfig.label.length === 0 && <span style={{fontStyle: 'italic'}}></span>}
  </span>
});


interface VarUseProps {
  varInfo: VarInfo | undefined,
}

export const VarUse = memo(function VarUse({varInfo}: VarUseProps) {
  const spanRef = useRef<HTMLSpanElement>(null);

  const [inspected, setInspected] = useState(false);

  return <div style={{display: "inline-flex", flexDirection: 'column', alignItems: 'center', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', cursor: 'pointer'}}
    onClick={() => setInspected(!inspected)}>
    <span
      ref={spanRef}
      style={{ backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', fontSize: '13px', cursor: 'pointer'}}
      onDoubleClick={() => {
        if (!varInfo) { return; }
        const def = document.querySelector(`.def-${varInfo.config.id}`);
        if (!def) { return; }
        def.scrollIntoView();
      }}
      >
      {varInfo?.config.label}
      {varInfo?.config.label.length === 0 && <span style={{fontStyle: 'italic'}}>unnamed</span>}
    </span>
    {/* {inspected && <span>{JSON.stringify(varInfo.value?.toolValue)}</span>} */}
    {(() => {
      if (!inspected) { return; }
      if (!varInfo) { return; }
      if (varInfo.value) {
        return <ObjectInspector data={varInfo.value.toolValue} />;
      } else {
        return <span style={{fontStyle: 'italic'}}>missing</span>;
      }
    })()}
  </div>
});