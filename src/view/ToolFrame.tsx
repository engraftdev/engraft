import { CSSProperties, memo, ReactNode } from "react";
import { cN } from "src/deps";
import { references, ToolProgram, VarBindings } from "src/tools-framework/tools";
import { Updater, useStateUpdateOnly } from "src/util/state";
import { Use } from "src/util/Use";
import useHover from "src/util/useHover";
import { WindowPortal } from "src/util/WindowPortal";
import IsolateStyles from "./IsolateStyles";
import { Value } from "./Value";
import { ValueEditable } from "./ValueEditable";


export interface ToolFrameProps {
  children: ReactNode;
  expand?: boolean;
  program: ToolProgram;
  updateProgram?: Updater<ToolProgram>;
  onClose?: () => void;
  varBindings: VarBindings;
}

const SOFT_STYLE = false as boolean;

export const ToolFrame = memo(function ToolFrame(props: ToolFrameProps) {
  const {children, expand, program, updateProgram, onClose, varBindings} = props;

  const [showInspector, updateShowInspector] = useStateUpdateOnly(false);

  return <div
    className={cN("ToolFrame", {xWidthFitContent: !expand})}
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

      return <div ref={hoverRef} className="ToolFrame-bar" style={{height: 15, fontSize: 13, color: '#0008', display: 'flex'}}>

        <div style={{
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
            onClick={() => {updateShowInspector((i) => !i)}}
          >i</div>
          {onClose &&
            <div style={buttonStyle}
              onClick={onClose}
            >×</div>
          }
        </>}

        <div style={{flexGrow: 1, minWidth: 6}}></div>
      </div>
    }}/>
    <div style={{minHeight: 0}}>
      {children}
    </div>
    {showInspector && <WindowPortal
      title="Tool info"
      onClose={() => {
        updateShowInspector(() => false);
      }}
    >
      <IsolateStyles>
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
    </WindowPortal>}
  </div>;
});
