import { ReactNode, memo } from "react";
import { ToolConfig, VarInfos, PossibleVarInfos } from "../tools-framework/tools";
import { useStateUpdateOnly } from "../util/state";
import { Value } from "./Value";
import WindowPortal from "../util/WindowPortal";


export interface ToolFrameProps {
  children: ReactNode;
  config: ToolConfig;
  onClose?: () => void;
  onCode?: () => void;
  onNotebook?: () => void;
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

export const ToolFrame = memo(function ToolFrame({children, config, onClose, onNotebook, onCode, env, possibleEnv}: ToolFrameProps) {
  const [showInspector, updateShowInspector] = useStateUpdateOnly(false);

  return <div style={{ minWidth: 100, border: '1px solid #0083', position: "relative", display: 'inline-flex', flexDirection: 'column', maxWidth: '100%' }}>
    <div style={{height: 15, background: '#e4e4e4', fontSize: 13, color: '#0008', display: 'flex'}}>
      <div style={{marginLeft: 2}}>{config.toolName}</div>
      <div style={{flexGrow: 1, minWidth: 6}}></div>
      {onCode &&
        <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onCode}
        >co</div>
      }
      {onNotebook &&
        <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onNotebook}
        >nb</div>
      }
      <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
        onClick={() => {updateShowInspector((i) => !i)}}
      >i</div>
      {onClose &&
        <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onClose}
        >×</div>
      }
    </div>
    {children}
    {showInspector && <WindowPortal
      title="Tool info"
      onClose={() => {
        updateShowInspector(() => false);
      }}
    >
      <h3>Config</h3>
      <Value value={config}/>
      <h3>Env</h3>
      <Value value={env}/>
      <h3>Possible env</h3>
      <Value value={possibleEnv}/>
    </WindowPortal>}
  </div>;
});