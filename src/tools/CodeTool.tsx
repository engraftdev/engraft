import { BabelFileResult } from '@babel/core';
import { transform } from '@babel/standalone';
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from '@codemirror/view';
import React, { memo, ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import seedrandom from 'seedrandom';
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps, VarInfo, VarInfos } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import CodeMirror from "src/util/CodeMirror";
import { refCompletions, setup, SubTool, toolCompletions } from "src/util/codeMirrorStuff";
import { compileExpression } from "src/util/compile";
import { createElementFromReact } from "src/util/createElementFrom";
import { DOM } from "src/util/DOM";
import { newId } from "src/util/id";
import { usePortalSet } from "src/util/PortalSet";
import refsExtension, { refCode, refRE } from "src/util/refsExtension";
import { Replace, updateKeys, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { useRefForCallback } from "src/util/useRefForCallback";
import IsolateStyles from "src/view/IsolateStyles";
import { ToolFrame } from "src/view/ToolFrame";
import { VarUse } from "src/view/Vars";
import update from 'immutability-helper';
import { GoogleMap } from 'src/view/GoogleMap';

export type CodeConfig = CodeConfigCodeMode | CodeConfigToolMode;

export interface CodeConfigShared {
  toolName: 'code',
  // defaultCode says that whoever made this CodeTool thought this would be a nice code for it.
  // * So, if we switch TO tool-mode, we will provide this as the default input for the tool.
  // * And if we switch FROM tool-mode, we will provide this as the default code again.
  // * Q: Should this be defaultCode or defaultInputConfig?
  defaultCode: string | undefined,
}

export interface CodeConfigCodeMode extends CodeConfigShared {
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolConfig},
}

export interface CodeConfigToolMode extends CodeConfigShared {
  modeName: 'tool',
  subConfig: ToolConfig,
}

export const CodeTool = memo(function CodeTool(props: ToolProps<CodeConfig>) {
  const {config, updateConfig} = props;

  if (config.modeName === 'code') {
    return <CodeToolCodeMode {...props} config={config} updateConfig={updateConfig as Updater<CodeConfig, CodeConfigCodeMode>} />;
  } else {
    return <CodeToolToolMode {...props} config={config} updateConfig={updateConfig as Updater<CodeConfig, CodeConfigToolMode>} />;
  }
})
registerTool<CodeConfig>(CodeTool, 'code', (defaultCode) => ({
  toolName: 'code',
  modeName: 'code',
  defaultCode,
  code: '',
  subTools: {},
}));


// Some notes about codeConfigSetTo:
// * Right now, this is the only reasonable way to make a tool of ANY sort. Why? It provides the
//   ToolFrame, and with it, the ability to switch out of the given tool into a different one.
export function codeConfigSetTo(config: ToolConfig | string): CodeConfig {
  // TODO: this is a hack, isn't it? (the config.toolName === 'code' part, I mean)
  if (typeof config !== 'string' && config.toolName === 'code') {
    return config as CodeConfig;
  }

  return {
    toolName: 'code',
    ...(typeof config === 'string' ?
        { modeName: 'code', code: config, subTools: {}, defaultCode: config }:
        { modeName: 'tool', subConfig: config, defaultCode: undefined }
    )
  };
}


export function summarizeCodeConfig(config: CodeConfig): ReactNode {
  if (config.modeName === 'code') {
    return <pre>{config.code.replaceAll(refRE, '_')}</pre>;
  } else {
    return config.subConfig.toolName;
  }
}


///////////////
// CODE MODE //
///////////////

let _transformCachedCache: {[code: string]: BabelFileResult} = {};
function transformCached(code: string) {
  const fromCache = _transformCachedCache[code]
  if (fromCache) { return fromCache; }
  const computed = transform(code, { presets: ["react"] });
  _transformCachedCache[code] = computed;
  return computed;
}

type CodeToolCodeModeProps = Replace<ToolProps<CodeConfig>, {
  config: CodeConfigCodeMode,
  updateConfig: Updater<CodeConfig, CodeConfigCodeMode>,
}>

export const CodeToolCodeMode = memo(function CodeToolCodeMode(props: CodeToolCodeModeProps) {
  const { config, updateConfig, reportOutput, reportView} = props;

  const compiled = useMemo(() => {
    try {
      // TODO: better treatment of non-expression code (multiple lines w/return, etc)
      let translated = transformCached("(" + config.code + ")").code!;
      translated = translated.replace(/;$/, "");
      const result = compileExpression(translated);
      return result;
    } catch (e) {
      // console.warn("error with", config.code)
      // console.warn(e);
    }
  }, [config.code])

  // We have to use useContext here, not in the view – the view isn't inside tool context!
  const env = useContext(EnvContext)
  const possibleEnv = useContext(PossibleEnvContext)

  const [subToolConfigs, updateSubToolConfigs] = useAt(config, updateConfig, 'subTools');
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
        update,
        GoogleMap,
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
    } else {
      setOutput(null);
    }
  }, [compiled, env, outputs, setOutput])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback((viewProps) => (
    <CodeToolCodeModeView
      {...props} {...viewProps}
      updateSubToolConfigs={updateSubToolConfigs}
      views={views}
      env={env} possibleEnv={possibleEnv}
    />
  ), [env, possibleEnv, props, updateSubToolConfigs, views])
  useView(reportView, view);

  return <>
    {Object.entries(subToolConfigs).map(([id, subToolConfig]) =>
      <SubTool key={id} id={id} subToolConfigs={subToolConfigs}
               updateSubToolConfigs={updateSubToolConfigs} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
});

interface CodeToolCodeModeViewProps extends CodeToolCodeModeProps, ToolViewProps {
  updateSubToolConfigs: Updater<{[id: string]: ToolConfig}>;
  views: {[id: string]: ToolView | null};
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

const CodeToolCodeModeView = memo(function CodeToolCodeModeView(props: CodeToolCodeModeViewProps) {
  const {config, updateConfig, autoFocus, updateSubToolConfigs, views, env, possibleEnv} = props;

  const [refSet, refs] = usePortalSet<{id: string}>();

  const envRef = useRefForCallback(env);
  const possibleEnvRef = useRefForCallback(possibleEnv);
  const extensions = useMemo(() => {
    function insertTool(tool: Tool<ToolConfig>) {
      const id = newId();
      const newConfig = codeConfigSetTo(tool.defaultConfig());
      updateKeys(updateSubToolConfigs, {[id]: newConfig});
      // TODO: we never remove these! lol
      return id;
    };
    function replaceWithTool(tool: Tool<ToolConfig>) {
      // console.log('replaceWithTool', config.defaultInput, tool.defaultConfig(config.defaultInput));
      updateConfig(() => ({toolName: 'code', modeName: 'tool', subConfig: tool.defaultConfig(config.defaultCode), defaultCode: config.defaultCode}))
    };
    const completions = [
      toolCompletions(insertTool, replaceWithTool),
      refCompletions(() => envRef.current, () => possibleEnvRef.current),
    ];
    return [
      ...setup,
      refsExtension(refSet),
      javascript({jsx: true}),
      autocompletion({override: completions}),
      EditorView.domEventHandlers({
        paste(event, view) {
          const text = event.clipboardData?.getData('text');
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.toolName) {
                // TODO: for now, we just replace – someday we should check about insertions
                updateConfig(() => codeConfigSetTo(parsed));
                event.preventDefault();
              }
            } catch {

            }
          }
        }
      }),
    ];
  }, [config.defaultCode, envRef, possibleEnvRef, refSet, updateConfig, updateSubToolConfigs])

  const onChange = useCallback((value: string) => {
    updateKeys(updateConfig, {code: value});
  }, [updateConfig]);

  const contents = <>
    <CodeMirror
      extensions={extensions}
      autoFocus={autoFocus}
      text={config.code}
      onChange={onChange}
    />
    {refs.map(([elem, {id}]) => {
      return ReactDOM.createPortal(
        views[id] ?
          <IsolateStyles style={{display: 'inline-block'}}>
            <ShowView view={views[id]} autoFocus={true}/>
          </IsolateStyles> :
          <VarUse key={id} varInfo={env[id] as VarInfo | undefined} />,
        elem
      )
    })}
  </>

  return <div className="xWidthFitContent" style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083', boxSizing: 'border-box', maxWidth: '100%'}}>
    {contents}
  </div>;
});



///////////////
// TOOL MODE //
///////////////

type CodeToolToolModeProps = Replace<ToolProps<CodeConfig>, {
  config: CodeConfigToolMode,
  updateConfig: Updater<CodeConfig, CodeConfigToolMode>,
}>

export const CodeToolToolMode = memo(function CodeToolToolMode({ config, reportOutput, reportView, updateConfig}: CodeToolToolModeProps) {

  const [component, toolView, output] = useSubTool({ config, updateConfig, subKey: 'subConfig' })

  useOutput(reportOutput, output);

  const env = useContext(EnvContext);
  const possibleEnv = useContext(PossibleEnvContext);

  const [subConfig, updateSubConfig] = useAt(config, updateConfig, 'subConfig');

  const view: ToolView = useCallback(({autoFocus}) => (
    <ToolFrame
      config={subConfig} updateConfig={updateSubConfig} env={env} possibleEnv={possibleEnv}
      onClose={() => {
        updateConfig(() => ({
          toolName: 'code',
          modeName: 'code',
          code: config.defaultCode || '',
          subTools: {},
          defaultCode: config.defaultCode,
        }));
      }}
    >
      {/* <div style={{ minWidth: 100, padding: '10px', position: "relative"}}> */}
        <ShowView view={toolView} autoFocus={autoFocus} />
      {/* </div> */}
    </ToolFrame>
  ), [config, env, possibleEnv, subConfig, toolView, updateConfig, updateSubConfig]);
  useView(reportView, view);

  return component;
});
