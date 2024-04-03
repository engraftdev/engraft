import { Completion, CompletionContext, CompletionSource, autocompletion, pickedCompletion } from "@codemirror/autocomplete";
import { ChangeSpec, EditorState, Extension, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { IsolateStyles, VarUse } from "@engraft/core-widgets";
import { objEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { useRefForCallback } from "@engraft/shared/lib/useRefForCallback.js";
import { EngraftContext, EngraftPromise, ReferenceCollection, ScopeVarBindingsContext, ShowView, Tool, ToolProgram, ToolResult, UpdateProxy, VarBinding, VarBindings, hookDedupe, hookFork, hookMemo, hookRunTool, randomId } from "@engraft/toolkit";
import _ from "lodash";
import { memo, useCallback, useContext, useMemo } from "react";
import ReactDOM from "react-dom";
import { CodeMirror } from "./CodeMirror.js";
import { usePortalSet } from "./PortalWidget.js";
import { defaultCopyCutHandler, setup } from "./codeMirrorStuff.js";
import { embedsExtension } from "./embedsExtension.js";
import { refCode, refREAll, referencesFromCodeDirect, referencesFromCodePromise } from "./refs.js";

// FancyCodeEditor is a CodeMirror editor with support for:
//   * reference tokens
//   * embedded subcomponents

// TODO: Code-mode slots inside FancyCodeEditor should have some minimal frame
// to distinguish them from the rest of the code

export type SubPrograms = {[id: string]: ToolProgram};

export function hookFancyCodeEditor(props: {
  code: string,
  subPrograms: SubPrograms,
  varBindings: VarBindings,
  context: EngraftContext,
}) {
  const { code, subPrograms, varBindings, context } = props;

  // TODO: this hookDedupe doesn't feel great
  const subResults = hookDedupe(hookMemo(() =>
    hookFork((branch) =>
      _.mapValues(subPrograms, (subProgram, id) => branch(id, () => {
        return hookMemo(() => {
          return hookRunTool({
            program: subProgram,
            varBindings,
            context,
          });
        }, [subProgram, varBindings])
      }))
    )
    , [subPrograms, varBindings]), objEqWithRefEq);


  const referencesDirect = hookMemo(() => referencesFromCodeDirect(code), [code]);
  const referencesPromise = hookMemo(() => referencesFromCodePromise(code), [code]);

  const referenceValuesP = hookMemo(() => EngraftPromise.try(() => {
    function resolveRef(ref: string) {
      if (subResults[ref]) {
        return subResults[ref].outputP;
      } else if (varBindings[ref]) {
        const binding = varBindings[ref];
        return binding.outputP.catch(() => {
          throw new Error(`Error from reference ${binding.var_.label}`);
        });
      } else {
        throw new Error(`Unknown reference ${ref}`);  // caught by promise
      }
    }

    const codeReferencesArrDirect = Array.from(referencesDirect);
    const codeReferencesArrPromise = Array.from(referencesPromise);

    const outputValuePsDirect = codeReferencesArrDirect.map(resolveRef);
    const outputValuePsPromise = codeReferencesArrPromise.map(resolveRef);

    return EngraftPromise.all(outputValuePsDirect).then((outputValuesDirect) => {
      return {
        ..._.zipObject(codeReferencesArrDirect, outputValuesDirect.map((v) => v.value)),
        ..._.zipObject(codeReferencesArrPromise.map(r => `${r}_promise`), outputValuePsPromise.map((p) => p.then(v => v.value))),
      };
    });
  }), [varBindings, subResults, referencesDirect, referencesPromise]);

  return { subResults, referenceValuesP };
}

export function collectReferencesForFancyCodeEditor(code: string, subPrograms: SubPrograms): ReferenceCollection {
  return [
    // references from code & subprograms...
    [...referencesFromCodeDirect(code)].map(id => ({id})),
    [...referencesFromCodePromise(code)].map(id => ({id})),
    Object.values(subPrograms),

    // ...minus the subprogram ids themselves
    { '-': Object.keys(subPrograms).map(id => ({id})) },
  ];
}


type FancyCodeEditorProps = {
  context: EngraftContext,
  extensions?: Extension[],
  defaultCode: string | undefined,
  code: string,
  codeUP: UpdateProxy<string>,
  subPrograms: SubPrograms,
  subProgramsUP: UpdateProxy<SubPrograms>,
  replaceWithProgram?: (toolProgram: ToolProgram) => void,
  subResults: {[id: string]: ToolResult},
  varBindings: VarBindings,
  autoFocus?: boolean,
  onBlur?: () => void,
}

export const FancyCodeEditor = memo(function FancyCodeEditor(props: FancyCodeEditorProps) {
  const scopeVarBindings = useContext(ScopeVarBindingsContext);
  if (scopeVarBindings === undefined) {
    throw new Error('FancyCodeEditor is being used outside of renderWithReact');
  }
  const scopeVarBindingsRef = useRefForCallback(scopeVarBindings);

  return <FancyCodeEditorWithScopeVarBindingsRef {...props} scopeVarBindingsRef={scopeVarBindingsRef} />;
});

export const FancyCodeEditorWithScopeVarBindingsRef = memo(function FancyCodeEditor(props: FancyCodeEditorProps & {scopeVarBindingsRef: React.MutableRefObject<VarBindings>}) {
  const { context, extensions, defaultCode, code, codeUP, subPrograms, subProgramsUP, replaceWithProgram, subResults, varBindings, autoFocus, onBlur, scopeVarBindingsRef } = props;

  const [refSet, refs] = usePortalSet<{id: string}>();

  const allExtensions = useMemo(() => {
    function insertTool(tool: Tool) {
      const id = randomId();
      const newProgram = context.makeSlotWithProgram(tool.makeProgram(context));
      subProgramsUP[id].$set(newProgram);
      // TODO: we never remove these! lol
      return id;
    };

    const completions = [
      refCompletions(() => scopeVarBindingsRef.current),
      toolCompletions(context, insertTool, replaceWithProgram && ((tool) => replaceWithProgram(tool.makeProgram(context, defaultCode)))),
    ];

    // TODO: We're storing some state here for inter-extension communication.
    // I'm sure there's a more correct CodeMirror-ish way.
    let pastedSubPrograms: SubPrograms | undefined = undefined;

    function copyCutHandler(event: ClipboardEvent, view: EditorView) {
      defaultCopyCutHandler(view, event);
      // Attach the program to the clipboard as json-engraft data
      // TODO: restrict to sub-programs that occur in the copied/cut text?
      event.clipboardData!.setData('application/json-engraft-subprograms', JSON.stringify(subPrograms));
      return true;
    }

    return [
      ...setup(),
      EditorView.theme({
        "&.cm-editor": {
          outline: "none",
          background: "rgb(245, 245, 245)",
        },
        "&.cm-editor.cm-focused": {
            outline: "none",
            background: "rgb(241, 246, 251)",
        },
      }),

      embedsExtension(refSet, refREAll),
      autocompletion({override: completions}),
      toolCompletionsTheme,
      EditorView.domEventHandlers({
        copy(event, view) {
          return copyCutHandler(event, view);
        },
        cut(event, view) {
          return copyCutHandler(event, view);
        },
        paste(event) {
          // Pasting code with json-engraft clipboard data
          // (here, we just save it so it's accessible in the transaction filter)
          const pastedJsonEngraftData = event.clipboardData?.getData('application/json-engraft-subprograms');
          if (pastedJsonEngraftData) {
            try {
              pastedSubPrograms = JSON.parse(pastedJsonEngraftData);
            } catch {
              console.warn("couldn't parse json engraft data", pastedJsonEngraftData);
              pastedSubPrograms = undefined;
            }
          } else {
            pastedSubPrograms = undefined;
          }
        }
      }),
      EditorState.transactionFilter.of(tr => {
        if (tr.annotation(Transaction.userEvent) === 'input.paste') {
          if (pastedSubPrograms) {
            // Pasting code with a json-engraft side-channel

            // TODO: replaceWithProgram if appropriate?

            let newChanges: ChangeSpec[] = [];
            tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
              // Scan through inserted text for IDs of subtools. If a subtool
              // is found, replace it with a new ID and insert the subtool
              // from pastedSubPrograms into this program.
              const insertedStr = inserted.toString()
              let insertedStrAfterReplacements = insertedStr;
              Object.entries(pastedSubPrograms!).forEach(([id, subProgram]) => {
                // It should really occur at most once, but just in case, we replaceAll.
                insertedStrAfterReplacements = insertedStrAfterReplacements.replaceAll(id, () => {
                  const newId = randomId();
                  subProgramsUP[newId].$set(subProgram);
                  return newId;
                });
              });
              if (insertedStrAfterReplacements !== insertedStr) {
                newChanges.push({ from: fromB, to: toB, insert: insertedStrAfterReplacements });
              }
            });
            if (newChanges.length > 0) {
              return [tr, { changes: newChanges, sequential: true }];
            }
          } else {
            // Check if we're pasting program JSON directly

            let newChanges: ChangeSpec[] = [];
            tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
              try {
                const parsed = JSON.parse(inserted.toString());
                if (parsed.toolName) {
                  if (fromB === 0 && toB === tr.newDoc.length && replaceWithProgram) {
                    // Replace the slot with the pasted program
                    // TODO: perhaps we should paste inline and then simplify on blur?
                    // TODO: default code?
                    replaceWithProgram(context.makeSlotWithProgram(parsed));
                  } else {
                    const newId = randomId();
                    subProgramsUP[newId].$set(context.makeSlotWithProgram(parsed));
                    newChanges.push({ from: fromB, to: toB, insert: newId });
                  }
                }
              } catch {
                // it's not JSON, totally expected
              }
            });
            if (newChanges.length > 0) {
              return [tr, { changes: newChanges, sequential: true }];
            }
          }
        }
        return tr;
      }),
      extensions || [],
    ];
  }, [context, defaultCode, extensions, refSet, replaceWithProgram, scopeVarBindingsRef, subPrograms, subProgramsUP])

  const onChange = useCallback((value: string) => {
    if (value !== code) {
      codeUP.$set(value);
      // TODO: remove unused subprograms, maybe after a delay to accomodate
      //       undo? (we might need to integrate with editor state more deeply
      //       to do this right)
    }
  }, [code, codeUP]);

  return <>
    <CodeMirror
      extensions={allExtensions}
      autoFocus={autoFocus}
      text={code}
      onChange={onChange}
      onBlur={onBlur}
    />
    {refs.map(([elem, {id}]) => {
      return ReactDOM.createPortal(
        subResults[id]
        ? <IsolateStyles style={{display: 'inline-block'}}>
            <ShowView view={subResults[id].view} updateProgram={subProgramsUP[id].$apply} />
          </IsolateStyles>
        : <VarUse key={id} varBinding={varBindings[id] as VarBinding | undefined} />,
        elem
      )
    })}
  </>;
});

// TODO: varBindingsGetter is pretty weird; CodeMirror might have a more idiomatic approach
export function refCompletions(varBindingsGetter?: () => VarBindings | undefined): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }

    const varBindings = varBindingsGetter ? varBindingsGetter() || {} : {};

    return {
      from: word.from,
      options: Object.values(varBindings).map((varBinding) => ({
        label: varBinding.var_.autoCompleteLabel || varBinding.var_.label,
        type: 'variable',
        apply: refCode(varBinding.var_.id),
      })),
    }
  };
}

export function toolCompletions(context: EngraftContext, insertTool: (tool: Tool) => string, replaceWithTool?: (tool: Tool) => void): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/\/?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.entries(context.dispatcher.getFullToolIndex())
          .filter(([_, tool]) => !tool.isInternal)
          .map(([toolName, tool]) => ({
            label: '/' + toolName,
            type: 'tool',
            apply: (view: EditorView, completion: Completion, from: number, to: number) => {
              if (replaceWithTool && from === 0 && to === view.state.doc.length) {
                replaceWithTool(tool);
              } else {
                const id = insertTool(tool);
                const completionText = refCode(id);
                view.dispatch({
                  changes: {from, to, insert: completionText},
                  selection: {anchor: from + completionText.length},
                  userEvent: "input.complete",
                  annotations: pickedCompletion.of(completion)
                });
              }
            }
          })),
      ]
    }
  }
}

export const toolCompletionsTheme = EditorView.baseTheme({
  ".cm-completionIcon-tool": {
    "&:after": { content: "'🛠️\uFE0E'" } // Disable emoji rendering
  },
})
