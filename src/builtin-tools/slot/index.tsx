import { NodePath, PluginItem } from '@babel/core';
import { transform } from '@babel/standalone';
import template from '@babel/template';
import babelTypes from '@babel/types';
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from '@codemirror/lang-javascript';
import { EditorState, RangeSet } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType } from '@codemirror/view';
import _ from 'lodash';
import objectInspect from 'object-inspect';
import { memo, useCallback, useMemo, useState } from "react";
import ReactDOM from 'react-dom';
import { cN } from 'src/deps';
import { ProgramFactory, references, Tool, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewRenderProps, VarBinding } from "src/engraft";
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { usePromiseState } from 'src/engraft/EngraftPromise.react';
import { hookRelevantVarBindings, hookRunTool } from 'src/engraft/hooks';
import { ShowView } from 'src/engraft/ShowView';
import { hookDedupe, hookMemo } from 'src/incr/hookMemo';
import { hookFork, hooks } from 'src/incr/hooks';
import { memoizeProps } from 'src/incr/memoize';
import { cache } from 'src/util/cache';
import CodeMirror from 'src/util/CodeMirror';
import { setup } from "src/util/codeMirrorStuff";
import { compileBodyCached, compileExpressionCached } from "src/util/compile";
import { embedsExtension } from 'src/util/embedsExtension';
import { objEqWithRefEq } from 'src/util/eq';
import { newId } from 'src/util/id';
import { Updater } from 'src/util/immutable';
import { usePortalSet } from 'src/util/PortalWidget';
import { makeRand } from 'src/util/rand';
import { difference, union } from 'src/util/sets';
import { Replace } from 'src/util/types';
import { useUpdateProxy } from 'src/util/UpdateProxy.react';
import { useRefForCallback } from 'src/util/useRefForCallback';
import IsolateStyles from 'src/view/IsolateStyles';
import { ToolFrame } from 'src/view/ToolFrame';
import { ToolInspectorWindow } from 'src/view/ToolInspectorWindow';
import { VarUse } from 'src/view/Vars';
import { refCompletions, toolCompletions } from './autocomplete';
import { globals } from './globals';
import { referencesFromCode, refRE } from './refs';

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

// Right now, this is the only reasonable way to make a tool of ANY sort. Why? It provides the
// ToolFrame, and with it, the ability to switch out of the given tool into a different one.
export function slotSetTo<P extends ToolProgram | string>(program: P): Program {
  // TODO: this is a hack, isn't it? (the program.toolName === 'slot' part, I mean)
  if (typeof program !== 'string' && program.toolName === 'slot') {
    return program as Program;
  }

  return {
    toolName: 'slot',
    ...(typeof program === 'string' ?
        { modeName: 'code', code: program, defaultCode: program, subPrograms: {} } :
        { modeName: 'tool', subProgram: program, defaultCode: undefined }
    )
  };
}

export const computeReferences = (program: Program) => {
  if (program.modeName === 'code') {
    return difference(
      // references from code & subprograms...
      union(referencesFromCode(program.code), ...Object.values(program.subPrograms).map(references)),
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

const transformExpressionCached = cache((code: string) => {
  return transform(code, {
    presets: ["react"],
  });
});

const transformBodyCached = cache((code: string) => {
  return transform(code, {
    presets: ["react"],
    plugins: [lineNumPlugin],
    parserOpts: { allowReturnOutsideFunction: true },
    generatorOpts: { retainLines: true }
  });
});

type CodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
}>

const runCodeMode = (props: CodeModeProps) => {
  const { program, varBindings } = props;

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

  const codeReferences = hookMemo(() => referencesFromCode(program.code), [program.code]);

  // TODO: Where, exactly, does this 'relevantVarBindings' thing belong?
  const relevantVarBindings = hookRelevantVarBindings(props);

  const codeReferenceScopeP = hookMemo(() => EngraftPromise.try(() => {
    const codeReferencesArr = Array.from(codeReferences);

    const outputValuePs = codeReferencesArr.map((ref) => {
      if (subResults[ref]) {
        return subResults[ref].outputP;
      } else if (relevantVarBindings[ref]) {
        const binding = relevantVarBindings[ref];
        return binding.outputP.catch(() => {
          throw new Error(`Error from reference ${binding.var_.label}`);
        });
      } else {
        throw new Error(`Unknown reference ${ref}`);  // caught by promise
      }
    })

    return EngraftPromise.all(outputValuePs).then((outputValues) => {
      return _.zipObject(codeReferencesArr, outputValues.map((v) => v.value));
    });
  }), [relevantVarBindings, codeReferences, subResults]);

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

  const varBindingsRef = useRefForCallback(varBindings);

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
      const id = newId();
      const newProgram = slotSetTo(tool.programFactory());
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
      refCompletions(() => varBindingsRef.current),
      toolCompletions(insertTool, replaceWithTool),
    ];
    return [
      ...setup,
      javascript({jsx: true}),
      keymap.of([
        {key: 'Shift-Mod-i', run: () => { setShowInspector((showInspector) => !showInspector); return true; }},
      ]),
      embedsExtension(refSet, refRE),
      autocompletion({override: completions}),
      EditorView.domEventHandlers({
        paste(event) {
          const text = event.clipboardData?.getData('text');
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.toolName) {
                // TODO: for now, we just replace – someday we should check about insertions
                updateProgram(() => slotSetTo(parsed));
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
  }, [refSet, logDecorations, programUP, program.defaultCode, varBindingsRef, updateProgram])

  const onChange = useCallback((value: string) => {
    programUP.code.$set(value);
  }, [programUP.code]);

  return (
    <div
      className={cN('CodeModeView', {xWidthFitContent: !expand})}
      style={{
        display: 'inline-block',
        minWidth: 20,
        border: '1px solid #0083',
        boxSizing: 'border-box',
        maxWidth: '100%',
        ...expand ? {width: '100%'} : {},
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
    backgroundColor: 'rgba(200,200,0,0.2)',
    color: 'rgba(0,0,0,0.8)',
    fontFamily: 'sans-serif',
    fontSize: '80%',
    borderRadius: '5px',
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
    return <ShowView view={subView} updateProgram={programUP.subProgram.$apply} autoFocus={autoFocus} />;
  } else {
    return <ToolFrame
      expand={expand}
      program={program.subProgram} updateProgram={programUP.subProgram.$apply} varBindings={varBindings}
      onClose={onCloseFrame}
    >
      <ShowView view={subView} updateProgram={programUP.subProgram.$apply} autoFocus={autoFocus} />
    </ToolFrame>;
  }
});
