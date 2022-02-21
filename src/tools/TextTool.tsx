import { useCallback, useContext, useMemo, useRef } from "react";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, ToolProps, VarInfo, VarInfos } from "../tools-framework/tools";
import { javascript } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";

import {keymap, highlightSpecialChars, drawSelection, dropCursor, EditorView} from "@codemirror/view"
import {EditorState} from "@codemirror/state"
import {history, historyKeymap} from "@codemirror/history"
import {foldKeymap} from "@codemirror/fold"
import {indentOnInput} from "@codemirror/language"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap, pickedCompletion, Completion} from "@codemirror/autocomplete"
import {commentKeymap} from "@codemirror/comment"
import {rectangularSelection} from "@codemirror/rectangular-selection"
import {defaultHighlightStyle} from "@codemirror/highlight"
import {lintKeymap} from "@codemirror/lint"
import { useOutput, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import CodeMirror from "../util/CodeMirror";
import { usePortalSet } from "../util/PortalSet";
import ReactDOM from "react-dom";
import { VarUse } from "../view/Vars";
import refsExtension, { refCode } from "../util/refsExtension";
import { useMemoObject } from "../util/useMemoObject";

export interface TextConfig {
  toolName: 'text';
  text: string;
}

const setup = [
  // lineNumbers(),
  // highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  // foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  // highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
]

function refCompletions(env?: VarInfos, possibleEnv?: PossibleVarInfos): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.values(env || {}).map((varInfo) => ({
          label: '@' + varInfo.config.label,
          apply: refCode(varInfo.config.id),
        })),
        ...Object.values(possibleEnv || {}).map((possibleVarInfo) => ({
          label: '@' + possibleVarInfo.config.label + '?',  // TODO: better signal that it's 'possible'
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            let apply = refCode(possibleVarInfo.config.id);
            possibleVarInfo.request();
            view.dispatch({
              changes: {from, to, insert: apply},
              selection: {anchor: from + apply.length},
              userEvent: "input.complete",
              annotations: pickedCompletion.of(completion)
            });
          }
        })),
      ]
    }
  };
}

export function TextTool({ config, updateConfig, reportOutput, reportView}: ToolProps<TextConfig>) {
  const [text, updateText] = useAt(config, updateConfig, 'text');

  const env = useContext(EnvContext)
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  const possibleEnv = useContext(PossibleEnvContext)
  const possibleEnvRef = useRef<PossibleVarInfos>();
  possibleEnvRef.current = possibleEnv;

  const replacedText = useMemo(() => {
    let result = text;
    Object.entries(env).forEach(([k, v]) => {
      let replacementText: string | undefined = undefined;
      result = result.replaceAll(refCode(k), () => {
        if (replacementText !== undefined) { return replacementText; }
        replacementText = '';
        if (v.value) {
          const toolValue = v.value.toolValue;
          if (typeof toolValue === 'object' && toolValue) {
            replacementText = toolValue.toString();
          }
          replacementText = "" + toolValue;
        }
        return replacementText;
      })
    })
    return result;
  }, [env, text])
  const output = useMemoObject({toolValue: replacedText});
  useOutput(reportOutput, output);

  const render = useCallback(function R({autoFocus}) {
    const [refSet, refs] = usePortalSet<{id: string}>();

    const extensions = useMemo(() => {
      const completions = [refCompletions(envRef.current, possibleEnvRef.current)];
      return [...setup, refsExtension(refSet), javascript(), autocompletion({override: completions})];
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
        return ReactDOM.createPortal(<VarUse varInfo={env[id] as VarInfo | undefined} />, elem)
      })}
    </>;
  }, [env, text, updateText])
  useView(reportView, render, config);

  return null;
}
registerTool(TextTool, {
  toolName: 'text',
  text: '',
});