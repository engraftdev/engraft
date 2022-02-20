import { useCallback, useContext, useMemo, useRef } from "react";
import { EnvContext, registerTool, ToolConfig, toolIndex, ToolProps, VarInfos } from "../tools-framework/tools";
import { javascript } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";

import {keymap, highlightSpecialChars, drawSelection, dropCursor, DecorationSet, Decoration, EditorView} from "@codemirror/view"
import {EditorState, StateField, EditorSelection, TransactionSpec, Text, Extension} from "@codemirror/state"
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
import CodeMirror from "../util/CodeMirror";
import useForceUpdate from "../util/useForceUpdate";
import PortalSet, { usePortalSet } from "../util/PortalSet";
import PortalWidget from "../util/PortalWidget";
import ReactDOM from "react-dom";

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



// function refCode(s: string) {
//   return `_α_${s}_ω_`
// }
// const refRE = new RegExp(refCode("([_a-zA-Z0-9]*)"), "g")

function refCode(s: string) {
  return s;
}
const refRE = new RegExp(refCode("(ID[a-z]*[0-9]{6})"), "g")




function refsFromText(text: Text, portalSet: PortalSet<{id: string}>) {
  const matches = Array.from(text.sliceString(0).matchAll(refRE));

  return RangeSet.of(
    matches.map((match) => {
      return Decoration.replace({
        widget: new PortalWidget(portalSet, {id: match[1]})
      }).range(match.index!, match.index! + match[0].length)
    })
  );
}

function refsExtension(portalSet: PortalSet<{id: string}>): Extension {
  const refsField = StateField.define<DecorationSet>({
    create(state) {
      return refsFromText(state.doc, portalSet)
    },
    update(old, tr) {
      return refsFromText(tr.newDoc, portalSet)
    },
    provide: f => EditorView.decorations.from(f)
  });

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

  return [refsField, jumpOverRefs]
}


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
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  // TODO: is the above an appropriate pattern to make a value available from a fixed (user-initiated) callback?

  const output = useMemo(() => {
    if (compiled) {
      const wrapped = Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.value?.toolValue]));
      try {
        return {toolValue: compiled(wrapped)};
      } catch {
      }
    }
    return null;
  }, [compiled, env])
  useOutput(reportOutput, output);

  // TODO: separate autocomplete for / & @

  const completions: CompletionSource = useCallback((completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/\/?@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.entries(toolIndex).map(([toolName, tool]) => ({
          label: '/' + toolName,
          apply: () => {
            updateKeys(updateConfig, {mode: {modeName: 'tool', config: tool.defaultConfig()}})
          }
        })),
        ...Object.values(envRef.current!).map((varInfo) => ({
          label: '@' + varInfo.config.label,
          apply: refCode(varInfo.config.id),
        })),
      ]
    }
  }, [updateConfig])  // TODO: react to new completions or w/e

  const [refSet, refs] = usePortalSet<{id: string}>();

  const extensions = useMemo(() =>
    [...setup, refsExtension(refSet), javascript(), autocompletion({override: [completions]})],
    [completions, refSet]  // TODO: these are constant
  )

  const render = useCallback(({autoFocus}) => {
    return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>
      <CodeMirror
        // extensions={[language]}
        // extensions={[language, language.language.data.of({ autocomplete: myCompletions }), checkboxPlugin]}
        initialExtensions={extensions}
        // javascriptLanguage.data.of({ autocomplete: completions })
        autoFocus={autoFocus}
        value={modeConfig.text}
        onChange={(value) => {
          updateKeys(updateModeConfig, {text: value});
        }}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          <span style={{ background: 'lightblue', borderRadius: '10px', padding: '0px 5px', fontFamily: 'sans-serif' }}>
            {env[id].config.label}
          </span>,
          elem
        )
      })}
    </div>;
  }, [env, extensions, modeConfig.text, refs, updateModeConfig])
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