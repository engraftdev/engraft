import { useCallback, useContext, useMemo } from "react";
import { EnvContext, registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";

import {keymap, highlightSpecialChars, drawSelection, dropCursor, DecorationSet, Decoration, EditorView, WidgetType} from "@codemirror/view"
import {EditorState, StateField, EditorSelection, TransactionSpec, Text} from "@codemirror/state"
import {history, historyKeymap} from "@codemirror/history"
import {foldKeymap} from "@codemirror/fold"
import {indentOnInput} from "@codemirror/language"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap} from "@codemirror/autocomplete"
import {commentKeymap} from "@codemirror/comment"
import {rectangularSelection} from "@codemirror/rectangular-selection"
import {defaultHighlightStyle} from "@codemirror/highlight"
import {lintKeymap} from "@codemirror/lint"
import { RangeSet } from "@codemirror/rangeset";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { updateKeys, Updater, useAt } from "../util/state";
import compile from "../util/compile";

export type CodeConfig = {
  toolName: 'code';
  mode: CodeConfigTextMode | CodeConfigToolMode;
}

export interface CodeConfigTextMode {
  modeName: 'text',
  text: string
}

export interface CodeConfigToolMode {
  modeName: 'tool',
  config: ToolConfig
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



class RefWidget extends WidgetType {
  constructor(readonly id: string) { super() }

  toDOM() {
    let wrap = document.createElement("span")
    wrap.innerText = this.id
    wrap.className = "lc-ref"
    return wrap
  }

  destroy() {

  }
}

function refCode(s: string) {
  return `_α_${s}_ω_`
}

const refRE = new RegExp(refCode("([_a-zA-Z0-9]*)"), "g")

// _α_my_token_ω_

function refsFromText(text: Text) {
  const matches = Array.from(text.sliceString(0).matchAll(refRE));

  return RangeSet.of(
    matches.map((match) => {
      return Decoration.replace({
        widget: new RefWidget(match[1])
      }).range(match.index!, match.index! + match[0].length)
    })
  );
}

const refsField = StateField.define<DecorationSet>({
  create(state) {
    return refsFromText(state.doc)
  },
  update(old, tr) {
    return refsFromText(tr.newDoc)
  },
  provide: f => EditorView.decorations.from(f)
})

const jumpOverRefs = EditorState.transactionFilter.of(tr => {
  const refs = tr.startState.field(refsField)

  // TODO: only single selection will be supported

  if (tr.isUserEvent('select')) {
    let {head, anchor} = tr.newSelection.main;
    let change = false;
    refs.between(head, head, (refFrom, refTo, ref) => {
      function applyWormhole(src: number, dst: number) {
        if (head === src) { head = dst; change = true; }
        if (anchor === src) { anchor = dst; change = true; }
      }
      applyWormhole(refTo - 1, refFrom);
      applyWormhole(refFrom + 1, refTo);
      if (change) { return false; }
    })
    if (change) {
      return [tr, {selection: tr.newSelection.replaceRange(EditorSelection.range(anchor, head))}];
    }
  } else if (tr.isUserEvent('delete.forward') || tr.isUserEvent('delete.backward')) {
    const forward = tr.isUserEvent('delete.forward')

    const head = tr.startState.selection.main.head;
    let result: TransactionSpec | readonly TransactionSpec[] = tr;
    refs.between(head, head, (refFrom, refTo, ref) => {
      if (head === (forward ? refFrom : refTo)) {
        result = [{changes: {from: refFrom, to: refTo}}];
        return false;
      }
    });
    return result;
  }

  return tr;
})

const refsTheme = EditorView.baseTheme({
  ".lc-ref": { background: 'lightblue', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif' }
})



export function CodeTool(props: ToolProps<CodeConfig>) {
  const {config, updateConfig} = props;

  let [modeConfig, updateModeConfig] = useAt(config, updateConfig, 'mode');

  if (modeConfig.modeName === 'text') {
    return <CodeToolTextMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigTextMode>} />;
  } else {
    return <CodeToolToolMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigToolMode>} />;
  }
}
registerTool(CodeTool, {
  toolName: 'code',
  mode: {
    modeName: 'text',
    text: ''
  }
});


export function CodeToolTextMode({ config, updateConfig, reportOutput, reportView, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigTextMode, updateModeConfig: Updater<CodeConfigTextMode> }) {
  const compiled = useMemo(() => {
    try {
      const result = compile(modeConfig.text)
      return result;
    } catch {
      // todo
    }
  }, [modeConfig.text])

  const env = useContext(EnvContext)

  const output = useMemo(() => {
    if (compiled) {
      const wrapped = Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.toolValue]));
      try {
        return {toolValue: compiled(wrapped)};
      } catch {
      }
    }
    return null;
  }, [compiled, env])
  useOutput(reportOutput, output);

  const completions: CompletionSource = useCallback((completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/^.*/)!
    if (word.from === word.to && !env.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.entries(toolIndex).map(([toolName, tool]) => ({
          label: '/' + toolName,
          apply: () => {
            updateKeys(updateConfig, {mode: {modeName: 'tool', config: tool.defaultConfig}})
          }
        })),
        ...Object.keys(env).map((contextKey) => ({
          label: '@' + contextKey,
          apply: refCode(contextKey),
        })),
      ]
    }
  }, [env, updateConfig])  // TODO: react to new completions or w/e

  const render = useCallback(({autoFocus}) => {
    return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>
      <CodeMirror
        // extensions={[language]}
        // extensions={[language, language.language.data.of({ autocomplete: myCompletions }), checkboxPlugin]}
        basicSetup={false}
        extensions={[...setup, refsField, refsTheme, jumpOverRefs, javascript(), autocompletion({override: [completions]})]}
        // javascriptLanguage.data.of({ autocomplete: completions })
        indentWithTab={false}
        autoFocus={autoFocus}
        value={modeConfig.text}
        onChange={(value) => {
          updateKeys(updateModeConfig, {text: value});
        }}
      />
    </div>;
  }, [completions, modeConfig.text, updateModeConfig])
  useView(reportView, render, config);

  return null;
}

export function CodeToolToolMode({ config, reportOutput, reportView, updateConfig, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigToolMode, updateModeConfig: Updater<CodeConfigToolMode> }) {

  const [component, view, output] = useSubTool({
    config: modeConfig,
    updateConfig: updateModeConfig,
    subKey: 'config',
  })

  useOutput(reportOutput, output);

  const render = useCallback(({autoFocus}) => {
    return <div style={{ display: 'inline-block', minWidth: 100, border: '1px solid #0083', padding: '10px', position: "relative", paddingTop: '15px', marginTop: '15px' }}>
      <ShowView view={view} autoFocus={autoFocus} />
      <button
        style={{ alignSelf: "flex-end", position: "absolute", left: 8, top: -10, border: '1px solid rgba(0,0,0,0.2)' }}
        onClick={() => {
          updateKeys(updateConfig, {mode: {modeName: 'text', text: ''}});
        }}>
        ×
      </button>
    </div>
  }, [updateConfig, view]);
  useView(reportView, render, config);

  return component;
}