import { ReactNode, useCallback, useContext, useMemo, useRef } from "react";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, ToolProps, ToolValue, ToolView, VarInfo, VarInfos } from "../tools-framework/tools";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion } from "@codemirror/autocomplete"
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { updateKeys, Updater, useAt, useStateUpdateOnly } from "../util/state";
import compile from "../util/compile";
import CodeMirror from "../util/CodeMirror";
import { usePortalSet } from "../util/PortalSet";
import ReactDOM from "react-dom";
import { VarUse } from "../view/Vars";
import WindowPortal from "../util/WindowPortal";
import refsExtension, { refCode } from "../util/refsExtension";
import Value from "../view/Value";
import id from "../util/id";
import { refCompletions, setup, SubTool, toolCompletions, ToolFrame } from "../util/codeMirrorStuff";
import ShadowDOM from "../util/ShadowDOM";
import { transform } from '@babel/standalone';
import React from "react";
import rootStyles from "../view/rootStyles";

export type CodeConfig = {
  toolName: 'code';
  mode: CodeConfigCodeMode | CodeConfigToolMode;
}

export interface CodeConfigCodeMode {
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolConfig}
}

export interface CodeConfigToolMode {
  modeName: 'tool',
  config: ToolConfig
}

export function CodeTool(props: ToolProps<CodeConfig>) {
  const {config, updateConfig} = props;

  let [modeConfig, updateModeConfig] = useAt(config, updateConfig, 'mode');

  if (modeConfig.modeName === 'code') {
    return <CodeToolCodeMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigCodeMode>} />;
  } else {
    return <CodeToolToolMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigToolMode>} />;
  }
}
registerTool(CodeTool, {
  toolName: 'code',
  mode: {
    modeName: 'code',
    code: '',
    subTools: {},
  }
});

export function codeConfigSetTo(config: ToolConfig | string): CodeConfig {
  // TODO: this is a hack, isn't it?
  if (typeof config !== 'string' && config.toolName === 'code') {
    return config as CodeConfig;
  }

  return {
    toolName: 'code',
    mode:
      typeof config === 'string' ?
        { modeName: 'code', code: config, subTools: {} }:
        { modeName: 'tool', config }
  };
}


export function CodeToolCodeMode({ config, updateConfig, reportOutput, reportView, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigCodeMode, updateModeConfig: Updater<CodeConfigCodeMode> }) {
  const compiled = useMemo(() => {
    try {
      let translated = transform(modeConfig.code, { presets: ["react"] }).code!;
      translated = translated.replace(/;$/, "");
      console.log(translated);
      const result = compile(translated);
      return result;
    } catch (e) {
      console.warn(e);
    }
  }, [modeConfig.code])

  const env = useContext(EnvContext)
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  const possibleEnv = useContext(PossibleEnvContext)
  const possibleEnvRef = useRef<PossibleVarInfos>();
  possibleEnvRef.current = possibleEnv;
  // TODO: is the above an appropriate pattern to make a value available from a fixed (user-initiated) callback?


  const [subTools, updateSubTools] = useAt(modeConfig, updateModeConfig, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});


  const output = useMemo(() => {
    if (compiled) {
      const scope = {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.value?.toolValue])),
        ...Object.fromEntries(Object.entries(outputs).map(([k, v]) => [refCode(k), v?.toolValue])),
        React
      };
      try {
        return {toolValue: compiled(scope)};
      } catch {
      }
    }
    return null;
  }, [compiled, env, outputs])
  useOutput(reportOutput, output);

  const render = useCallback(function R({autoFocus}) {
    const [refSet, refs] = usePortalSet<{id: string}>();

    const extensions = useMemo(() => {
      function insertTool(tool: Tool<ToolConfig>) {
        const newId = id();
        const newConfig = codeConfigSetTo(tool.defaultConfig());
        updateKeys(updateSubTools, {[newId]: newConfig});
        // TODO: we never remove these! lol
        return newId;
      };
      function replaceWithTool(tool: Tool<ToolConfig>) {
        updateKeys(updateConfig, {mode: {modeName: 'tool', config: tool.defaultConfig()}});
      };
      const completions = [
        toolCompletions(insertTool, replaceWithTool),
        refCompletions(() => envRef.current, () => possibleEnvRef.current)
      ];
      return [...setup, refsExtension(refSet), javascript({jsx: true}), autocompletion({override: completions})];
    }, [refSet])

    const onChange = useCallback((value) => {
      updateKeys(updateModeConfig, {code: value});
    }, []);

    // return

    const contents = <>
      <CodeMirror
        extensions={extensions}
        autoFocus={autoFocus}
        text={modeConfig.code}
        onChange={onChange}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          subTools[id] ?
            // TODO: this style-resetting is tedious; is there a better way?
            <ShadowDOM style={{all: 'initial', display: 'inline-block'}}>
              <div style={rootStyles}>
                <ShowView view={views[id]} autoFocus={true}/>
              </div>
            </ShadowDOM> :
            <VarUse varInfo={env[id] as VarInfo | undefined} />,
          elem
        )
      })}
    </>;

    if (false) {
      return <ToolFrame config={config} env={env} possibleEnv={possibleEnv}>
        {contents}
      </ToolFrame>;
    } else {
      return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>
        {contents}
      </div>;
    }
  }, [config, env, modeConfig.code, possibleEnv, subTools, updateConfig, updateModeConfig, updateSubTools, views])
  useView(reportView, render, config);

  return <>
    {Object.entries(subTools).map(([id, subToolConfig]) =>
      <SubTool key={id} id={id} subToolConfigs={subTools}
               updateSubToolConfigs={updateSubTools} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
}


export function CodeToolToolMode({ config, reportOutput, reportView, updateConfig, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigToolMode, updateModeConfig: Updater<CodeConfigToolMode> }) {

  const [component, view, output] = useSubTool({
    config: modeConfig,
    updateConfig: updateModeConfig,
    subKey: 'config',
  })

  useOutput(reportOutput, output);

  const env = useContext(EnvContext);
  const possibleEnv = useContext(PossibleEnvContext);

  const render = useCallback(function R({autoFocus}) {
    return <ToolFrame config={modeConfig.config} env={env} possibleEnv={possibleEnv} onClose={() => {updateKeys(updateConfig, {mode: {modeName: 'code', code: '', subTools: {}}});}}>
      {/* <div style={{ minWidth: 100, padding: '10px', position: "relative"}}> */}
        <ShowView view={view} autoFocus={autoFocus} />
      {/* </div> */}
    </ToolFrame>
  }, [env, modeConfig.config, possibleEnv, updateConfig, view]);
  useView(reportView, render, config);

  return component;
}
