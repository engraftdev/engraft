import { Updater } from "@engraft/shared/lib/Updater.js";
import { Use } from "@engraft/shared/lib/Use.js";
import { useHover } from "@engraft/shared/lib/useHover.js";
import { EngraftContext, ToolProgram, VarBindings } from "@engraft/toolkit";
import { CSSProperties, ReactNode, memo, useState } from "react";
import { ToolInspectorWindow } from "./ToolInspectorWindow.js";

export type ToolFrameProps = {
  children: ReactNode,
  expand?: boolean,
  program: ToolProgram,
  updateProgram?: Updater<ToolProgram>,
  setFrameBarBackdropElem?: (frameBarBackdropElem: HTMLDivElement) => void,
  onClose?: () => void,
  varBindings: VarBindings,
  context: EngraftContext,
}

export const ToolFrame = memo(function ToolFrame(props: ToolFrameProps) {
  const {children, expand, program, updateProgram, onClose, varBindings, context, setFrameBarBackdropElem} = props;

  const [showInspector, setShowInspector] = useState(false);

  return <div
    className={`ToolFrame ${!expand ? 'xWidthFitContent' : ''}`}
    style={{
      border: '1px solid #c4c4ff',
      position: "relative", display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      maxWidth: '100%',
    }}
  >
    <Use hook={useHover} children={([hoverRef, isHovered]) => {
      const buttonStyle: CSSProperties = {
        background: '#e4e4ff',
        borderRadius: 7,
        width: 14, height: 14,
        fontSize: 10, lineHeight: '14px',
        textAlign: 'center', alignSelf: 'center',
        cursor: 'pointer',
        marginLeft: 3
      };

      return <div
        ref={hoverRef}
        className="ToolFrame-bar"
        style={{position: 'relative'}}
      >

        <div
          className="ToolFrame-bar-backdrop"
          ref={setFrameBarBackdropElem}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          }}
        />

        <div
          className="ToolFrame-bar-frontdrop"
          style={{
            height: 15, fontSize: 13, color: '#0008', display: 'flex', position: 'relative', zIndex: 1
          }}
        >
          <div style={{
            position: 'relative',
            // paddingLeft: 5, paddingRight: 2, background: '#e4e4ff', borderBottomLeftRadius: 5
            paddingLeft: 2, paddingRight: 5, background: '#e4e4ff', borderBottomRightRadius: 5,
            userSelect: 'none', lineHeight: '15px',
          }}>
            {program.toolName}
          </div>

          {/* TODO: Feedback for clicking 'cp' */}
          {/* TODO: Is cp going to break unique-ID constraints? Hmmmmm. */}
          { isHovered && <>
            <div style={buttonStyle}
              onClick={() => {navigator.clipboard.writeText(JSON.stringify(program))}}
            >cp</div>
            <div style={buttonStyle}
              onClick={() => {setShowInspector(true)}}
            >i</div>
            {onClose &&
              <div style={buttonStyle}
                onClick={onClose}
              >×</div>
            }
          </>}

          <div style={{flexGrow: 1, minWidth: 6}}></div>
        </div>
      </div>
    }}/>
    <div style={{minHeight: 0}}>
      {children}
    </div>
    <ToolInspectorWindow
      show={showInspector}
      onClose={() => {setShowInspector(false)}}
      program={program}
      updateProgram={updateProgram}
      varBindings={varBindings}
      context={context}
    />
  </div>;
});
