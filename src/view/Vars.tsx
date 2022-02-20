import { useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { VarConfig, VarInfo } from "../tools-framework/tools";
import ControlledTextInput, { ControlledSpan } from "../util/ControlledTextInput";
import { updateKeys, Updater } from "../util/state";
import rectConnect, { Point } from 'rect-connect';

(window as any).rectConnect = rectConnect;


interface VarDefinitionProps {
  varConfig: VarConfig,
  updateVarConfig: Updater<VarConfig>,
  autoFocus?: boolean,
}

export function VarDefinition({varConfig, updateVarConfig, autoFocus}: VarDefinitionProps) {
  return <span className={`def-${varConfig.id}`}
    style={{ backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', border: '1px solid gray', fontSize: '13px', }}>
    <ControlledSpan value={varConfig.label} onValue={(label) => updateKeys(updateVarConfig, {label})}
          style={{border: 'none', background: 'none'}} autoFocus={autoFocus}/>
    {varConfig.label.length === 0 && <span style={{fontStyle: 'italic'}}></span>}
  </span>
}


interface VarUseProps {
  varInfo: VarInfo,
}

export function VarUse({varInfo}: VarUseProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const overlay = useMemo(() => document.getElementById("overlay"), []);
  const [hovered, setHovered] = useState<{source: Point, target: Point} | null>(null);

  return <span
    ref={spanRef}
    style={{ backgroundImage: 'linear-gradient(180deg,#f4f4f4,#e4e4e4)', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif', fontSize: '13px', cursor: 'pointer'}}
    onDoubleClick={() => {
      const def = document.querySelector(`.def-${varInfo.config.id}`);
      if (!def) { return; }
      def.scrollIntoView();
    }}
    // onMouseOver={() => {
    //   if (!spanRef.current || !overlay) { return; }
    //   const def = document.querySelector(`.def-${varInfo.config.id}`);
    //   if (!def) { return; }
    //   const overlayRect = overlay.getBoundingClientRect();
    //   const spanRect = spanRef.current.getBoundingClientRect();
    //   const defRect = def.getBoundingClientRect();

    //   const spanD = {x: (spanRect.left + spanRect.right)/2 - overlayRect.x, y: (spanRect.top + spanRect.bottom)/2 - overlayRect.y};
    //   const defD = {x: (defRect.left + defRect.right)/2 - overlayRect.x, y: (defRect.top + defRect.bottom)/2 - overlayRect.y};
    //   const conn = rectConnect(spanD, spanRect, defD, defRect);
    //   console.log(conn);

    //   setHovered(conn);
    // }}
    // onMouseOut={() => {
    //   setHovered(null);
    // }}
    >
    {ReactDOM.createPortal(
      <svg width={1} height={1} style={{overflow: 'visible'}}>
        {hovered &&
          <line x1={hovered.source.x} y1={hovered.source.y} x2={hovered.target.x} y2={hovered.target.y} stroke="black"/>
        }
      </svg>,
      document.getElementById('overlay')!
    )}
    {varInfo.config.label}
    {varInfo.config.label.length === 0 && <span style={{fontStyle: 'italic'}}>unnamed</span>}
  </span>
}