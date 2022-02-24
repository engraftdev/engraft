import { useCallback, useContext, useMemo, useRef } from "react";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, ToolProps, ToolValue, ToolView, VarInfo, VarInfos } from "../tools-framework/tools";
import { markdown } from "@codemirror/lang-markdown";
import { autocompletion } from "@codemirror/autocomplete"
import { ShowView, useOutput, useView } from "../tools-framework/useSubTool";
import { updateKeys, useAt, useStateUpdateOnly } from "../util/state";
import CodeMirror from "../util/CodeMirror";
import { usePortalSet } from "../util/PortalSet";
import ReactDOM from "react-dom";
import { VarUse } from "../view/Vars";
import refsExtension, { refCode } from "../util/refsExtension";
import { useMemoObject } from "../util/useMemoObject";
import { refCompletions, setup, SubTool, toolCompletions } from "../util/codeMirrorStuff";
import id from "../util/id";
import { codeConfigSetTo } from "./CodeTool";
import { EditorView } from "@codemirror/view";
import IsolateStyles from "../view/IsolateStyles";

export interface TextConfig {
  toolName: 'text';
  text: string;
  subTools: {[id: string]: ToolConfig};
}

export function TextTool({ config, updateConfig, reportOutput, reportView}: ToolProps<TextConfig>) {
  const [text, updateText] = useAt(config, updateConfig, 'text');

  const env = useContext(EnvContext)
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  const possibleEnv = useContext(PossibleEnvContext)
  const possibleEnvRef = useRef<PossibleVarInfos>();
  possibleEnvRef.current = possibleEnv;

  const [subTools, updateSubTools] = useAt(config, updateConfig, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const replacedText = useMemo(() => {
    let result = text;
    const applyReplacement = ([k, v]: readonly [string, ToolValue | null]) => {
      let replacementText = '';
      if (v) {
        const toolValue = v.toolValue;
        if (typeof toolValue === 'object' && toolValue) {
          replacementText = toolValue.toString();
        }
        replacementText = "" + toolValue;
      }
      result = result.replaceAll(refCode(k), replacementText);
    }
    Object.entries(env).map(([k, v]) => [k, v.value || null] as const).forEach(applyReplacement);
    Object.entries(outputs).forEach(applyReplacement);
    return result;
  }, [env, outputs, text])
  const output = useMemoObject({toolValue: replacedText});
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
      const completions = [
        toolCompletions(insertTool),
        refCompletions(() => envRef.current, () => possibleEnvRef.current)
      ];
      return [...setup, refsExtension(refSet), markdown(), autocompletion({override: completions}), EditorView.lineWrapping];
    }, [refSet])

    const onChange = useCallback((value) => {
      updateText(() => value);
    }, []);

    // return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>

    return <>
      <CodeMirror
        extensions={extensions}
        autoFocus={autoFocus}
        text={text}
        onChange={onChange}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          subTools[id] ?
            <IsolateStyles style={{display: 'inline-block'}}>
              <ShowView view={views[id]} autoFocus={true}/>
            </IsolateStyles> :
            <VarUse varInfo={env[id] as VarInfo | undefined} />,
          elem
        )
      })}
    </>;
  }, [env, subTools, text, updateSubTools, updateText, views])
  useView(reportView, render, config);

  return <>
    {Object.entries(subTools).map(([id, subToolConfig]) =>
      <SubTool key={id} id={id} subToolConfigs={subTools}
              updateSubToolConfigs={updateSubTools} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
}
registerTool(TextTool, {
  toolName: 'text',
  text: '',
  subTools: {},
});