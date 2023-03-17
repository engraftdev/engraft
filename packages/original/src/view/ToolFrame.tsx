import { ToolProgram, VarBindings } from "@engraft/core";
import classNames from "classnames";
import { CSSProperties, memo, ReactElement, ReactNode, useState } from "react";
import { Updater } from "../util/immutable.js";
import { Use } from "../util/Use.js";
import useHover from "../util/useHover.js";
import { ToolInspectorWindow } from "./ToolInspectorWindow.js";


export type ToolFrameProps = {
  children: ReactNode,
  expand?: boolean,
  program: ToolProgram,
  updateProgram?: Updater<ToolProgram>,
  frameBarBackdrop?: ReactElement | null,
  onClose?: () => void,
  varBindings: VarBindings,
}

const SOFT_STYLE = false as boolean;

export const ToolFrame = memo(function ToolFrame(props: ToolFrameProps) {
  const {children, expand, program, updateProgram, onClose, varBindings, frameBarBackdrop} = props;

  const [showInspector, setShowInspector] = useState(false);

  return <div
    className={classNames("ToolFrame", {xWidthFitContent: !expand})}
    style={{
      ...!SOFT_STYLE && {border: '1px solid #c4c4ff'},
      position: "relative", display: 'inline-flex', flexDirection: 'column', boxSizing: 'border-box',
      height: '100%', maxWidth: '100%',
      ...SOFT_STYLE && {borderRadius: 5, boxShadow: '0px 0px 5px 0px #c4c4ff'},
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
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          }}
        >
          {frameBarBackdrop}
        </div>

        <div
          className="ToolFrame-bar-frontdrop"
          style={{
            height: 15, fontSize: 13, color: '#0008', display: 'flex', position: 'relative'
          }}
        >
          <div style={{
            position: 'relative',
            // paddingLeft: 5, paddingRight: 2, background: '#e4e4ff', borderBottomLeftRadius: 5
            paddingLeft: 2, paddingRight: 5, background: '#e4e4ff', borderBottomRightRadius: 5,
            ...SOFT_STYLE && {borderTopLeftRadius: 5},
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
    <div style={{minHeight: 0, overflowX: 'auto'}}>
      {children}
    </div>
    <ToolInspectorWindow
      show={showInspector}
      onClose={() => {setShowInspector(false)}}
      program={program}
      updateProgram={updateProgram}
      varBindings={varBindings}
    />
  </div>;
});
