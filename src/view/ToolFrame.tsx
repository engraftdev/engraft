import { ReactNode, memo, useCallback } from "react";
import { ToolConfig, VarInfos, PossibleVarInfos } from "src/tools-framework/tools";
import { Updater, useStateUpdateOnly } from "src/util/state";
import { Value } from "./Value";
import { WindowPortal } from "src/util/WindowPortal";
import { ValueEditable } from "./ValueEditable";
import IsolateStyles from "./IsolateStyles";
import { Menu, MenuMaker, WithContextMenu } from "src/util/WithContextMenu";
import { Use } from "src/util/Use";
import useHover from "src/util/useHover";


export interface ToolFrameProps {
  children: ReactNode;
  config: ToolConfig;
  updateConfig?: Updater<ToolConfig>;
  onClose?: () => void;
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

export const ToolFrame = memo(function ToolFrame({children, config, updateConfig, onClose, env, possibleEnv}: ToolFrameProps) {
  const [showInspector, updateShowInspector] = useStateUpdateOnly(false);

  const menuMaker: MenuMaker = useCallback(() => {
    return [
      // { type: 'heading', heading: 'TOOL' },
      { type: 'contents', contents: 'Copy config' },
      { type: 'contents', contents: 'Show debug info' },
      { type: 'contents', contents: 'Delete tool' },
    ]
  }, [])

  return <div
    className="ToolFrame"
    style={{
      border: '1px solid #c4c4ff', position: "relative", display: 'inline-flex', flexDirection: 'column', boxSizing: 'border-box',
      width: '100%', height: '100%'
    }}
  >
    <Use hook={useHover} children={([hoverRef, isHovered]) =>
      <div ref={hoverRef} className="ToolFrame-bar" style={{height: 15, fontSize: 13, color: '#0008', display: 'flex'}}>

        <div style={{
          // paddingLeft: 5, paddingRight: 2, background: '#e4e4ff', borderBottomLeftRadius: 5
          paddingLeft: 2, paddingRight: 5, background: '#e4e4ff', borderBottomRightRadius: 5,
          userSelect: 'none', lineHeight: '15px',
        }}>
          {config.toolName}
        </div>

        {/* TODO: Feedback for clicking 'cp' */}
        {/* TODO: Is cp going to break unique-ID constraints? Hmmmmm. */}
        { isHovered && <>
          <div style={{background: '#e4e4ff', borderRadius: 7, width: 14, height: 14, fontSize: 10, lineHeight: '14px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginLeft: 3}}
            onClick={() => {navigator.clipboard.writeText(JSON.stringify(config))}}
          >cp</div>
          <div style={{background: '#e4e4ff', borderRadius: 7, width: 14, height: 14, fontSize: 10, lineHeight: '14px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginLeft: 3}}
            onClick={() => {updateShowInspector((i) => !i)}}
          >i</div>
          {onClose &&
            <div style={{background: '#e4e4ff', borderRadius: 7, width: 14, height: 14, fontSize: 10, lineHeight: '14px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginLeft: 3}}
              onClick={onClose}
            >×</div>
          }
        </>}

        <div style={{flexGrow: 1, minWidth: 6}}></div>
      </div>
    }/>
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
        <h3>Config</h3>
        { updateConfig ?
          <ValueEditable value={config} updater={updateConfig}/> :
          <Value value={config}/>
        }
        <h3>Env</h3>
        <Value value={env}/>
        <h3>Possible env</h3>
        <Value value={possibleEnv}/>
      </IsolateStyles>
    </WindowPortal>}
  </div>;
});
