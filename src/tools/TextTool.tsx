import { autocompletion } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { memo, useCallback, useContext, useMemo } from "react";
import ReactDOM from "react-dom";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps, VarInfo, VarInfos } from "../tools-framework/tools";
import { ShowView, useOutput, useView } from "../tools-framework/useSubTool";
import CodeMirror from "../util/CodeMirror";
import { refCompletions, setup, SubTool, toolCompletions } from "../util/codeMirrorStuff";
import { newId } from "../util/id";
import { usePortalSet } from "../util/PortalSet";
import refsExtension, { refCode } from "../util/refsExtension";
import { updateKeys, useAt, useStateUpdateOnly } from "../util/state";
import { useMemoObject } from "../util/useMemoObject";
import { useRefForCallback } from "../util/useRefForCallback";
import IsolateStyles from "../view/IsolateStyles";
import { VarUse } from "../view/Vars";
import { codeConfigSetTo } from "./CodeTool";

export interface TextConfig {
  toolName: 'text';
  text: string;
  subTools: {[id: string]: ToolConfig};
}

export const TextTool = memo(function TextTool(props: ToolProps<TextConfig>) {
  const { config, updateConfig, reportOutput, reportView} = props;

  const [subToolConfigs, updateSubToolConfigs] = useAt(config, updateConfig, 'subTools');

  const env = useContext(EnvContext)
  const possibleEnv = useContext(PossibleEnvContext)

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const replacedText = useMemo(() => {
    let result = config.text;
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
  }, [config.text, env, outputs])
  const output = useMemoObject({toolValue: replacedText});
  useOutput(reportOutput, output);

  const view: ToolView = useCallback((viewProps) => (
    <TextToolView
      {...props} {...viewProps}
      views={views}
      env={env}
      possibleEnv={possibleEnv}
    />
  ), [env, possibleEnv, props, views])
  useView(reportView, view);

  return <>
    {Object.entries(subToolConfigs).map(([id, subToolConfig]) =>
      <SubTool key={id} id={id} subToolConfigs={subToolConfigs}
              updateSubToolConfigs={updateSubToolConfigs} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
})
registerTool(TextTool, 'text', {
  toolName: 'text',
  text: '',
  subTools: {},
});


interface TextToolViewProps extends ToolProps<TextConfig>, ToolViewProps {
  views: {[id: string]: ToolView | null};
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

const TextToolView = memo(function TextToolView(props: TextToolViewProps) {
  const { config, updateConfig, autoFocus, views, env, possibleEnv } = props;

  const [, updateSubToolConfigs] = useAt(config, updateConfig, 'subTools');
  const [text, updateText] = useAt(config, updateConfig, 'text');

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
    const completions = [
      toolCompletions(insertTool),
      refCompletions(() => envRef.current, () => possibleEnvRef.current)
    ];
    return [...setup, refsExtension(refSet), markdown(), autocompletion({override: completions}), EditorView.lineWrapping];
  }, [envRef, possibleEnvRef, refSet, updateSubToolConfigs])

  const onChange = useCallback((value: string) => {
    updateText(() => value);
  }, [updateText]);

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
        views[id] ?
          <IsolateStyles style={{display: 'inline-block'}}>
            <ShowView view={views[id]} autoFocus={true}/>
          </IsolateStyles> :
          <VarUse varInfo={env[id] as VarInfo | undefined} />,
        elem
      )
    })}
  </>;
})
