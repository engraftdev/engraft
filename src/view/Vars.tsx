import { memo, useRef, useState } from "react";
import { Var, VarBinding } from "src/engraft";
import { ControlledSpan } from "src/util/ControlledTextInput";
import { Updater } from "src/util/immutable";
import { ObjectInspector } from "react-inspector";
import { usePromiseState } from "src/engraft/EngraftPromise.react";
import { updateF } from "src/util/updateF";


interface VarDefinitionProps {
  var_: Var,
  updateVar?: Updater<Var>,
  autoFocus?: boolean,
}

export const VarDefinition = memo(function VarDefinition({var_, updateVar, autoFocus}: VarDefinitionProps) {
  return <div
    className={`def-${var_.id}`}
    style={{ display: 'inline-block', backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', border: '1px solid gray', fontSize: '13px', minHeight: '13px'}}
  >
    <ControlledSpan value={var_.label} onValue={(label) => updateVar && updateVar(updateF({label: {$set: label}}))}
          style={{border: 'none', background: 'none'}} autoFocus={autoFocus}/>
    {var_.label.length === 0 && <span style={{fontStyle: 'italic'}}></span>}
  </div>
});


interface VarUseProps {
  varBinding: VarBinding | undefined,
}

export const VarUse = memo(function VarUse({varBinding}: VarUseProps) {
  const spanRef = useRef<HTMLSpanElement>(null);

  const [inspected, setInspected] = useState(false);

  return <div style={{display: "inline-flex", flexDirection: 'column', alignItems: 'center', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', cursor: 'pointer'}}
    onClick={() => setInspected(!inspected)}>
    <span
      ref={spanRef}
      style={{ backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', fontSize: '13px', cursor: 'pointer'}}
      onDoubleClick={() => {
        if (!varBinding) { return; }
        const def = document.querySelector(`.def-${varBinding.var_.id}`);
        if (!def) { return; }
        def.scrollIntoView();
      }}
      >
      {varBinding
       ? varBinding?.var_.label.length > 0
         ? <span dangerouslySetInnerHTML={{__html: varBinding.var_.label}}/>
         : <span style={{fontStyle: 'italic'}}>unnamed</span>
       : <span style={{fontStyle: 'italic'}}>unknown ref</span>
      }
    </span>
    { inspected && varBinding && <VarUseInspector varBinding={varBinding} /> }
  </div>
});

type VarUseInspectorProps = {
  varBinding: VarBinding,
}

export const VarUseInspector = memo(function VarUseInspector(props: VarUseInspectorProps) {
  const {varBinding} = props;

  const outputState = usePromiseState(varBinding.outputP);

  if (outputState.status === 'fulfilled') {
    return <ObjectInspector data={outputState.value} />;
  } else {
    return <span style={{fontStyle: 'italic'}}>missing</span>;
  }
});
