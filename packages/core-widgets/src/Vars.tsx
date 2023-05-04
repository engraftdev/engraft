import { Var, VarBinding, usePromiseState } from "@engraft/core";
import { ControlledSpan } from "@engraft/shared/lib/ControlledTextInput.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { CSSProperties, memo, useRef, useState } from "react";
import { ObjectInspector } from "react-inspector";


const sharedStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'hsl(30, 100%, 90%)',
  fontStyle: 'italic',
  // border: '1px solid hsl(30, 100%, 70%)',
}

interface VarDefinitionProps {
  var_: Var,
  updateVar?: Updater<Var>,
  autoFocus?: boolean,
  attach?: 'right' | 'down',
  style?: CSSProperties,
}

export const VarDefinition = memo(function VarDefinition(props: VarDefinitionProps) {
  const { var_, updateVar, autoFocus, attach, style } = props;
  const varUP = useUpdateProxy(updateVar);

  const radii: CSSProperties =
    attach === 'right'
    ? {borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px'}
    : attach === 'down'
    ? {borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}
    : {borderRadius: '10px'};

  return <div
    className={`def-${var_.id}`}
    style={{
      ...sharedStyle,
      ...radii,
      padding: '0px 5px',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      minHeight: '13px',
      height: 18,
      paddingRight: 10,
      ...style,
    }}
  >
    <ControlledSpan value={var_.label} onValue={(label) => varUP && varUP.label.$set(label)}
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

  return <div
    style={{
      ...sharedStyle,
      borderRadius: '10px',
      cursor: 'pointer'
    }}
    onClick={() => setInspected(!inspected)}>
    <span
      ref={spanRef}
      style={{
        // backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)',
        borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', fontSize: '13px', cursor: 'pointer'}}
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
    return <ObjectInspector data={outputState.value.value} />;
  } else {
    return <span style={{fontStyle: 'italic'}}>missing</span>;
  }
});
