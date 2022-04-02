import { memo, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, ToolProps, ToolValue, ToolView, VarInfo, VarInfos } from "../tools-framework/tools";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion } from "@codemirror/autocomplete"
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { Replace, updateKeys, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "../util/state";
import compile from "../util/compile";
import CodeMirror from "../util/CodeMirror";
import { usePortalSet } from "../util/PortalSet";
import ReactDOM from "react-dom";
import { VarUse } from "../view/Vars";
import refsExtension, { refCode } from "../util/refsExtension";
import id from "../util/id";
import { refCompletions, setup, SubTool, toolCompletions, ToolFrame } from "../util/codeMirrorStuff";
import { transform } from '@babel/standalone';
import React from "react";
import IsolateStyles from "../view/IsolateStyles";
import seedrandom from 'seedrandom';
import { notebookConfigSetTo } from "./NotebookTool";
import { createElementFromReact } from "../util/createElementFrom";
import { DOM } from "../util/DOM";

export type CodeConfig = CodeConfigCodeMode | CodeConfigToolMode;

export interface CodeConfigCodeMode {
  toolName: 'code',
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolConfig}
}

export interface CodeConfigToolMode {
  toolName: 'code',
  modeName: 'tool',
  subConfig: ToolConfig
}

export const CodeTool = memo(function CodeTool(props: ToolProps<CodeConfig>) {
  const {config, updateConfig} = props;

  if (config.modeName === 'code') {
    return <CodeToolCodeMode {...props} config={config} updateConfig={updateConfig as Updater<CodeConfig, CodeConfigCodeMode>} />;
  } else {
    return <CodeToolToolMode {...props} config={config} updateConfig={updateConfig as Updater<CodeConfig, CodeConfigToolMode>} />;
  }
})
registerTool(CodeTool, {
  toolName: 'code',
  modeName: 'code',
  code: '',
  subTools: {},
});

export function codeConfigSetTo(config: ToolConfig | string): CodeConfig {
  // TODO: this is a hack, isn't it? (the config.toolName === 'code' part, I mean)
  if (typeof config !== 'string' && config.toolName === 'code') {
    return config as CodeConfig;
  }

  return {
    toolName: 'code',
    ...(typeof config === 'string' ?
        { modeName: 'code', code: config, subTools: {} }:
        { modeName: 'tool', subConfig: config }
    )
  };
}


type CodeToolCodeModeProps = Replace<ToolProps<CodeConfig>, {
  config: CodeConfigCodeMode,
  updateConfig: Updater<CodeConfig, CodeConfigCodeMode>,
}>

export const CodeToolCodeMode = memo(function CodeToolCodeMode({ config, updateConfig, reportOutput, reportView}: CodeToolCodeModeProps) {
  const compiled = useMemo(() => {
    try {
      // TODO: better treatment of non-expression code (multiple lines w/return, etc)
      let translated = transform("(" + config.code + ")", { presets: ["react"] }).code!;
      translated = translated.replace(/;$/, "");
      const result = compile(translated);
      return result;
    } catch (e) {
      // console.warn("error with", config.code)
      // console.warn(e);
    }
  }, [config.code])

  const env = useContext(EnvContext)
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  const possibleEnv = useContext(PossibleEnvContext)
  const possibleEnvRef = useRef<PossibleVarInfos>();
  possibleEnvRef.current = possibleEnv;
  // TODO: is the above an appropriate pattern to make a value available from a fixed (user-initiated) callback?


  const [subTools, updateSubTools] = useAt(config, updateConfig, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null);
  useEffect(() => {
    if (compiled) {
      const rand = seedrandom('live-compose 2022');
      const scope = {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.value?.toolValue])),
        ...Object.fromEntries(Object.entries(outputs).map(([k, v]) => [refCode(k), v?.toolValue])),
        React,
        rand,
        createElementFromReact,
        DOM,
      };
      try {
        const result = compiled(scope);
        if (result instanceof Promise) {
          result.then((value) => {
            setOutput({toolValue: value});
          })
        } else {
          setOutput({toolValue: compiled(scope)});
        }
      } catch (e) {
        // console.warn("error with", config.code)
        console.warn(e);
        setOutput(null);
      }
    }
  }, [compiled, env, outputs, setOutput])
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
        updateConfig(() => ({toolName: 'code', modeName: 'tool', subConfig: tool.defaultConfig()}))
      };
      const completions = [
        toolCompletions(insertTool, replaceWithTool),
        refCompletions(() => envRef.current, () => possibleEnvRef.current)
      ];
      return [...setup, refsExtension(refSet), javascript({jsx: true}), autocompletion({override: completions})];
    }, [refSet])

    const onChange = useCallback((value) => {
      updateKeys(updateConfig, {code: value});
    }, []);

    // return

    const contents = <>
      <CodeMirror
        extensions={extensions}
        autoFocus={autoFocus}
        text={config.code}
        onChange={onChange}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          subTools[id] ?
            <IsolateStyles style={{display: 'inline-block'}}>
              <ShowView view={views[id]} autoFocus={true}/>
            </IsolateStyles> :
            <VarUse key={id} varInfo={env[id] as VarInfo | undefined} />,
          elem
        )
      })}
    </>;

    if (false) {
      return <ToolFrame config={config} env={env} possibleEnv={possibleEnv}>
        {contents}
      </ToolFrame>;
    } else {
      return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083', maxWidth: '100%'}}>
        {contents}
      </div>;
    }
  }, [config, env, possibleEnv, subTools, updateConfig, updateSubTools, views])
  useView(reportView, render, config);

  return <>
    {Object.entries(subTools).map(([id, subToolConfig]) =>
      <SubTool key={id} id={id} subToolConfigs={subTools}
               updateSubToolConfigs={updateSubTools} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
});


type CodeToolToolModeProps = Replace<ToolProps<CodeConfig>, {
  config: CodeConfigToolMode,
  updateConfig: Updater<CodeConfig, CodeConfigToolMode>,
}>

export const CodeToolToolMode = memo(function CodeToolToolMode({ config, reportOutput, reportView, updateConfig}: CodeToolToolModeProps) {

  const [component, view, output] = useSubTool({ config, updateConfig, subKey: 'subConfig' })

  useOutput(reportOutput, output);

  const env = useContext(EnvContext);
  const possibleEnv = useContext(PossibleEnvContext);

  const render = useCallback(function R({autoFocus}) {
    return <ToolFrame
      config={config.subConfig} env={env} possibleEnv={possibleEnv}
      onClose={() => {updateConfig(() => ({toolName: 'code', modeName: 'code', code: '', subTools: {}}))}}
      onCode={() => {
        const newId = id();
        updateConfig(() => ({
          toolName: 'code',
          modeName: 'code',
          code: refCode(newId),
          subTools: {[newId]: config},
        }))
      }}
      onNotebook={config.subConfig.toolName === 'notebook' ? undefined : () => {
        updateConfig(() => ({
          toolName: 'code',
          modeName: 'tool',
          subConfig: notebookConfigSetTo(config),
        }))
      }}
    >
      {/* <div style={{ minWidth: 100, padding: '10px', position: "relative"}}> */}
        <ShowView view={view} autoFocus={autoFocus} />
      {/* </div> */}
    </ToolFrame>
  }, [config, env, possibleEnv, updateConfig, view]);
  useView(reportView, render, config);

  return component;
});