import { NodePath, PluginItem, TransformOptions } from "@babel/core";
import { transform } from "@babel/standalone";
import TemplateDefault, * as TemplateModule from "@babel/template";
import babelTypes from "@babel/types";
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState, RangeSet } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, keymap } from "@codemirror/view";
import { EngraftPromise, ProgramFactory, ShowView, Tool, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewContext, ToolViewRenderProps, VarBinding, hookRunTool, randomId, references, setSlotWithCode, setSlotWithProgram, usePromiseState } from "@engraft/core";
import { hookDedupe, hookFork, hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { cache } from "@engraft/shared/lib/cache.js";
import { objEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { difference, union } from "@engraft/shared/lib/sets.js";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import _ from "lodash";
import objectInspect from "object-inspect";
import { memo, useCallback, useContext, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { CodeMirror } from "../../util/CodeMirror.js";
import { usePortalSet } from "../../util/PortalWidget.js";
import { setup } from "../../util/codeMirrorStuff.js";
import { compileBodyCached, compileExpressionCached } from "../../util/compile.js";
import { embedsExtension } from "../../util/embedsExtension.js";
import { Updater } from "../../util/immutable.js";
import { makeRand } from "../../util/rand.js";
import { Replace } from "../../util/types.js";
import { useRefForCallback } from "../../util/useRefForCallback.js";
import IsolateStyles from "../../view/IsolateStyles.js";
import { ToolFrame } from "../../view/ToolFrame.js";
import { ToolInspectorWindow } from "../../view/ToolInspectorWindow.js";
import { VarUse } from "../../view/Vars.js";
import { refCompletions, toolCompletions, toolCompletionsTheme } from "./autocomplete.js";
import { globals } from "./globals.js";
import { refREAll, referencesFromCodeDirect, referencesFromCodePromise } from "./refs.js";

// TODO: what hath ESM wrought?
const template = (TemplateDefault.default || TemplateModule.default) as unknown as typeof import("@babel/template").default;

export type Program = ProgramCodeMode | ProgramToolMode;

type ProgramShared = {
  toolName: 'slot',
  // defaultCode says that whoever made this SlotTool thought this would be a nice code for it.
  // * So, if we switch TO tool-mode, we will provide this as the default input for the tool.
  // * And if we switch FROM tool-mode, we will provide this as the default code again.
  // * Q: Should this be defaultCode or defaultInputProgram?
  defaultCode: string | undefined,
}

type ProgramCodeMode = ProgramShared & {
  modeName: 'code',
  code: string,
  subPrograms: {[id: string]: ToolProgram},
}

type ProgramToolMode = ProgramShared & {
  modeName: 'tool',
  subProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'slot',
  modeName: 'code',
  defaultCode,
  code: '',
  subPrograms: {},
});

function slotWithCode(program: string = ''): Program {
  return {
    toolName: 'slot',
    modeName: 'code',
    code: program,
    defaultCode: program,
    subPrograms: {},
  };
}
setSlotWithCode(slotWithCode);

function slotWithProgram(program: ToolProgram): Program {
  // TODO: this condition is a hack, isn't it?
  if (program.toolName === 'slot') {
    return program as Program;
  }

  return {
    toolName: 'slot',
    modeName: 'tool',
    subProgram: program,
    defaultCode: undefined,
  };
}
setSlotWithProgram(slotWithProgram);

export const computeReferences = (program: Program) => {
  if (program.modeName === 'code') {
    return difference(
      // references from code & subprograms...
      union(
        referencesFromCodeDirect(program.code),
        referencesFromCodePromise(program.code),
        ...Object.values(program.subPrograms).map(references),
      ),
      // ...minus the subprogram ids themselves
      Object.keys(program.subPrograms)
    );
  } else {
    return references(program.subProgram);
  }
};

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const {program, varBindings} = props;

  return hookFork((branch) => {
    if (program.modeName === 'code') {
      return branch('code mode', () => {
        return runCodeMode({
          ...props,
          program,
          varBindings,
        });
      });
    } else {
      return branch('tool mode', () => {
        return runToolMode({
          ...props,
          program,
          varBindings,
        });
      });
    }
  });
}));


///////////////
// CODE MODE //
///////////////

const lineNumTemplate = template(`
  __inst_lineNum(%%num%%);
`);

const lineNumPlugin: PluginItem = function({types: t}: {types: typeof babelTypes}) {
  let nodesToSkip = new Set<babelTypes.Node>();
  return {
    visitor: {
      Statement: {
        exit(path: NodePath<babelTypes.Statement>) {
          if (nodesToSkip.has(path.node)) { return; }
          if (!path.node.loc) { return; }
          const newNode = lineNumTemplate({num: t.numericLiteral(path.node.loc.end.line)}) as babelTypes.Statement;
          nodesToSkip.add(newNode);
          path.insertBefore(newNode);
        }
      },
    },
  };
}

const transformExpressionOptions: TransformOptions = {
  presets: [
    "react",
  ],
};
const transformExpressionCached = cache((code: string) => {
  return transform(code, transformExpressionOptions);
});

const transformBodyOptions: TransformOptions = {
  ...transformExpressionOptions,
  plugins: [
    lineNumPlugin
  ],
  parserOpts: { allowReturnOutsideFunction: true },
  generatorOpts: { retainLines: true }
};
const transformBodyCached = cache((code: string) => {
  return transform(code, transformBodyOptions);
});

type CodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
}>

const runCodeMode = (props: CodeModeProps) => {
  const { program, varBindings } = props;

  // hookLogChanges({program, varBindings}, 'slot:runCodeMode');

  const compiledP = hookMemo(() => EngraftPromise.try(() => {
    if (program.code === '') {
      throw new Error("Empty code");
    }

    // TODO: this split between "expression" and "body" pipelines is wrong. (e.g., logs in .map callbacks of expressions fail.)
    //       really, we should parse everything as body and then identify single-expression bodies which need "return" added.
    // TODO: it probably isn't performant either.
    // TODO: async function bodies? low priority
    try {
      // Try to interpret as expression
      let transformed = transformExpressionCached("(" + program.code + ")").code!
      transformed = transformed.replace(/;$/, "");
      return compileExpressionCached(transformed);
    } catch {
      // Try to interpret as function body
      let transformed = transformBodyCached(program.code).code!;
      return compileBodyCached(transformed);
    }
  }), [program.code])

  // TODO: this hookDedupe doesn't feel great
  const subResults = hookDedupe(hookMemo(() =>
    hookFork((branch) =>
      _.mapValues(program.subPrograms, (subProgram, id) => branch(id, () => {
        return hookMemo(() => {
          return hookRunTool({
            program: subProgram,
            varBindings,
          });
        }, [subProgram, varBindings])
      }))
    )
  , [program.subPrograms, varBindings]), objEqWithRefEq);

  const codeReferencesDirect = hookMemo(() => referencesFromCodeDirect(program.code), [program.code]);
  const codeReferencesPromise = hookMemo(() => referencesFromCodePromise(program.code), [program.code]);

  const codeReferenceScopeP = hookMemo(() => EngraftPromise.try(() => {
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

    const codeReferencesArrDirect = Array.from(codeReferencesDirect);
    const codeReferencesArrPromise = Array.from(codeReferencesPromise);

    const outputValuePsDirect = codeReferencesArrDirect.map(resolveRef);
    const outputValuePsPromise = codeReferencesArrPromise.map(resolveRef);

    return EngraftPromise.all(outputValuePsDirect).then((outputValuesDirect) => {
      return {
        ..._.zipObject(codeReferencesArrDirect, outputValuesDirect.map((v) => v.value)),
        ..._.zipObject(codeReferencesArrPromise.map(r => `${r}_promise`), outputValuePsPromise.map((p) => p.then(v => v.value))),
      };
    });
  }), [varBindings, subResults, codeReferencesDirect, codeReferencesPromise]);

  const outputAndLogsP = hookMemo(() => {
    return EngraftPromise.all(compiledP, codeReferenceScopeP).then(([compiled, codeReferenceScope]) => {
      // To manage logs, we keep one special global:
      //   __log: A function which logs using the active slot's line numbers and logs array.

      // TODO: This "temporarily reset global logger" setup doesn't work with asynchronicity at all.
      //   (IDK how to do dynamic scope with asynchronicity...)

      let lineNum = 1;
      let logs: {lineNum: number, text: string}[] = [];

      // Reset the global logger to user our versions of `lineNum` and `logs`.
      (window as any).__log = (...vals: any[]) => {
        const text = vals.map((v) => objectInspect(v)).join(", ");
        logs.push({lineNum, text});
        return vals[vals.length - 1];
      };

      const __inst_lineNum = (newLineNum: number) => {
        lineNum = newLineNum;
      };
      const log = (...vals: any[]) => {
        (window as any).__log(...vals);
      };
      const rand = makeRand();
      const scope = {
        ...globals,
        ...codeReferenceScope,
        rand,
        __inst_lineNum,
        log,
      };

      return EngraftPromise.resolve(compiled(scope)).then((value) => {
        return [{value}, logs] as const;
      });
    })
  }, [compiledP, codeReferenceScopeP]);

  const outputP = hookMemo(() => {
    return outputAndLogsP.then(([output, _]) => output);
  }, [outputAndLogsP]);

  const logsP = hookMemo(() => {
    return outputAndLogsP.then(([_, logs]) => logs);
  }, [outputAndLogsP]);

  const subViews = hookMemo(() => {
    return _.mapValues(subResults, (subResult, id) => {
      return subResult.view;
    });
  }, [subResults]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (viewProps) =>
      <CodeModeView
        {...props} {...viewProps} updateProgram={viewProps.updateProgram as Updater<Program, ProgramCodeMode>}
        subViews={subViews}
        logsP={logsP}
      />
  }), [props]);

  return {outputP, view};
};

type CodeModeViewProps = CodeModeProps & ToolViewRenderProps<Program> & {
  subViews: {[id: string]: ToolView<any>},
  logsP: EngraftPromise<{lineNum: number, text: string}[]>,
  updateProgram: Updater<Program, ProgramCodeMode>,
};

const CodeModeView = memo(function CodeModeView(props: CodeModeViewProps) {
  const {program, varBindings, updateProgram, expand, autoFocus, subViews, logsP} = props;
  const programUP = useUpdateProxy(updateProgram);

  const { scopeVarBindings } = useContext(ToolViewContext);
  const scopeVarBindingsRef = useRefForCallback(scopeVarBindings);

  const [showInspector, setShowInspector] = useState(false);

  const [refSet, refs] = usePortalSet<{id: string}>();

  const logsState = usePromiseState(logsP);

  const cmText = useMemo(() => {
    return EditorState.create({doc: program.code}).doc;
  }, [program.code])

  const logDecorations = useMemo(() => {
    if (logsState.status !== 'fulfilled') { return []; }

    try {
      return EditorView.decorations.of(RangeSet.of(logsState.value.map(({lineNum, text}) => {
        return logDecoration(text, cmText.line(lineNum).to);
      }), true));
    } catch {
      // TODO: cmText.line can fail when logs and cmText get out of sync; should probably get them
      // back into sync, but for now, catch the error.
      return [];
    }
  }, [logsState, cmText]);

  const extensions = useMemo(() => {
    function insertTool(tool: Tool) {
      const id = randomId();
      const newProgram = slotWithProgram(tool.programFactory());
      programUP.subPrograms[id].$set(newProgram);
      // TODO: we never remove these! lol
      return id;
    };
    function replaceWithTool(tool: Tool) {
      programUP.$as<Program>().$set({
        toolName: 'slot',
        modeName: 'tool',
        subProgram: tool.programFactory(program.defaultCode),
        defaultCode: program.defaultCode
      });
    };
    const completions = [
      refCompletions(() => scopeVarBindingsRef.current),
      toolCompletions(insertTool, replaceWithTool),
    ];
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
      javascript({jsx: true}),
      keymap.of([
        {key: 'Shift-Mod-i', run: () => { setShowInspector((showInspector) => !showInspector); return true; }},
      ]),
      embedsExtension(refSet, refREAll),
      autocompletion({override: completions}),
      toolCompletionsTheme,
      EditorView.domEventHandlers({
        paste(event) {
          const text = event.clipboardData?.getData('text');
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.toolName) {
                // TODO: for now, we just replace – someday we should check about insertions
                updateProgram(() => slotWithProgram(parsed));
                event.preventDefault();
              }
            } catch {
              // totally expected
            }
          }
        }
      }),
      logTheme,
      logDecorations,
    ];
  }, [refSet, logDecorations, programUP, program.defaultCode, scopeVarBindingsRef, updateProgram])

  const onChange = useCallback((value: string) => {
    if (value !== program.code) {
      programUP.code.$set(value);
    }
  }, [program.code, programUP.code]);

  return (
    <div
      className='CodeModeView'
      style={{
        display: 'inline-block',
        minWidth: 20,
        // border: '1px solid #0083',
        boxSizing: 'border-box',
        width: '100%',
        ...expand ? {width: '100%'} : {},
        // background: 'hsl(0, 0%, 98%)',
      }}
    >
      <CodeMirror
        extensions={extensions}
        autoFocus={autoFocus}
        text={program.code}
        onChange={onChange}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          subViews[id]
          ? <IsolateStyles style={{display: 'inline-block'}}>
              <ShowView view={subViews[id]} updateProgram={programUP.subPrograms[id].$apply} />
            </IsolateStyles>
          : <VarUse key={id} varBinding={varBindings[id] as VarBinding | undefined} />,
          elem
        )
      })}
      <ToolInspectorWindow
        show={showInspector}
        onClose={() => {setShowInspector(false)}}
        program={program}
        updateProgram={updateProgram as any}
        varBindings={varBindings}
      />
    </div>
  );
});

function logDecoration(text: string, offset: number) {
  return Decoration.widget({
    widget: new HTMLWidget(`<span class="chalk-log">${text}</span>`),
    side: 1,
  }).range(offset);
}

class HTMLWidget extends WidgetType {
  constructor(readonly html: string) { super() }

  eq(other: HTMLWidget) { return other.html === this.html }

  toDOM() {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.html.trim();

    return tempDiv.firstElementChild as HTMLElement;
  }
}

const logTheme = EditorView.baseTheme({
  ".chalk-log": {
    backgroundColor: 'white',
    color: 'rgba(0,0,0,0.8)',
    fontFamily: 'sans-serif',
    fontSize: '80%',
    // borderRadius: '5px',
    marginLeft: '15px',
    paddingLeft: '5px',
    paddingRight: '5px',
  },
  ".chalk-log + .chalk-log": {
    marginLeft: '5px',
  },
});


///////////////
// TOOL MODE //
///////////////

type ToolModeProps = Replace<ToolProps<Program>, {
  program: ProgramToolMode,
}>

const runToolMode = (props: ToolModeProps) => {
  const { program, varBindings } = props;

  const { outputP: subOutputP, view: subView } = hookRunTool({ program: program.subProgram, varBindings });

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <ToolModeView
      {...props} {...renderProps} updateProgram={renderProps.updateProgram as Updater<Program, ProgramToolMode>}
      subView={subView}
    />,
    showsOwnOutput: subView.showsOwnOutput,
    // TODO: what happens if we add more properties to ToolView?
  }), [subView]);

  return { outputP: subOutputP, view };
};

type ToolModeViewProps = ToolModeProps & ToolViewRenderProps<Program> & {
  subView: ToolView<any>,
  updateProgram: Updater<Program, ProgramToolMode>,
};

const ToolModeView = memo(function ToolModeView(props: ToolModeViewProps) {
  const {program, varBindings, updateProgram, expand, autoFocus, noFrame, subView} = props;
  const programUP = useUpdateProxy(updateProgram);

  const updateSubProgram = programUP.subProgram.$;

  const onCloseFrame = useCallback(() => {
    updateProgram(() => ({
      toolName: 'slot',
      modeName: 'code',
      code: program.defaultCode || '',
      subPrograms: {},
      defaultCode: program.defaultCode,
    }));
  }, [program.defaultCode, updateProgram]);

  if (noFrame) {
    return <ShowView view={subView} updateProgram={updateSubProgram} autoFocus={autoFocus} />;
  } else {
    return <ToolFrame
      expand={expand}
      program={program.subProgram} updateProgram={updateSubProgram} varBindings={varBindings}
      frameBarBackdrop={subView.renderFrameBarBackdrop && subView.renderFrameBarBackdrop({updateProgram: updateSubProgram})}
      onClose={onCloseFrame}
    >
      <ShowView view={subView} updateProgram={updateSubProgram} autoFocus={autoFocus} />
    </ToolFrame>;
  }
});
