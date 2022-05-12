import { ReactNode, memo } from "react";
import { ToolConfig, VarInfos, PossibleVarInfos } from "../tools-framework/tools";
import { Updater, useStateUpdateOnly } from "../util/state";
import { Value } from "./Value";
import WindowPortal from "../util/WindowPortal";
import { ValueEditable } from "./ValueEditable";
import IsolateStyles from "./IsolateStyles";


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

  return <div
    className="ToolFrame"
    style={{
      border: '1px solid #0083', position: "relative", display: 'inline-flex', flexDirection: 'column', boxSizing: 'border-box',
      width: '100%', height: '100%'
    }}
  >
    <div className="ToolFrame-bar" style={{height: 15, background: '#e4e4e4', fontSize: 13, color: '#0008', display: 'flex'}}>
      <div style={{marginLeft: 2}}>{config.toolName}</div>
      <div style={{flexGrow: 1, minWidth: 6}}></div>
      {/* TODO: Feedback for clicking 'cp' */}
      {/* TODO: Is cp going to break unique-ID constraints? Hmmmmm. */}
      <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
        onClick={() => {navigator.clipboard.writeText(JSON.stringify(config))}}
      >cp</div>
      <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
        onClick={() => {updateShowInspector((i) => !i)}}
      >i</div>
      {onClose &&
        <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onClose}
        >×</div>
      }
    </div>
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
