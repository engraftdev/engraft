/// <reference path="babel_plugin-proposal-do-expressions.d.ts" />
import { NodePath, PluginItem, TransformOptions } from "@babel/core";
import proposalDoExpressions from "@babel/plugin-proposal-do-expressions";
import { transform } from "@babel/standalone";
import TemplateDefault, * as TemplateModule from "@babel/template";
import babelTypes from "@babel/types";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState, RangeSet } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, keymap } from "@codemirror/view";
import { FancyCodeEditor, collectReferencesForFancyCodeEditor, hookFancyCodeEditor } from "@engraft/codemirror-helpers";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { cache } from "@engraft/shared/lib/cache.js";
import { compileBodyCached } from "@engraft/shared/lib/compile.js";
import { CollectReferences, EngraftContext, EngraftPromise, MakeProgram, ShowView, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, defineTool, hookFork, hookMemo, hookRunTool, hooks, memoizeProps, renderWithReact, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import objectInspect from "object-inspect";
import { memo, useCallback, useMemo, useState } from "react";
import { ToolFrame } from "./ToolFrame.js";
import { ToolInspectorWindow } from "./ToolInspectorWindow.js";
import { globals } from "./globals/index.js";
import { makeRand } from "./globals/rand.js";

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

const makeProgram: MakeProgram<Program> = (context: EngraftContext, defaultCode?: string) => ({
  toolName: 'slot',
  modeName: 'code',
  defaultCode,
  code: '',
  subPrograms: {},
});

export function makeSlotWithCode(code?: string): Program {
  return {
    toolName: 'slot',
    modeName: 'code',
    code: code || '',
    defaultCode: code,
    subPrograms: {},
  };
}

export function makeSlotWithProgram(program: ToolProgram, defaultCode?: string): Program {
  // TODO: this shortcut is a hack, isn't it?
  if (program.toolName === 'slot') {
    return program as Program;
  }
  return {
    toolName: 'slot',
    modeName: 'tool',
    subProgram: program,
    defaultCode,
  };
}

const collectReferences: CollectReferences<Program> = (program: Program) => {
  if (program.modeName === 'code') {
    return collectReferencesForFancyCodeEditor(program.code, program.subPrograms);
  } else {
    return program.subProgram;
  }
};

const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
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

export default defineTool({ name: 'slot', makeProgram, collectReferences, run })


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

const transformBodyOptions: TransformOptions = {
  presets: [
    "react",
  ],
  plugins: [
    lineNumPlugin,
    proposalDoExpressions,
  ],
  parserOpts: { allowReturnOutsideFunction: true },
  generatorOpts: { retainLines: true }
};
const transformBodyCached = cache((code: string) => {
  return transform(code, transformBodyOptions);
});

export type Replace<T, U> = Omit<T, keyof U> & U;

type CodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
}>

const runCodeMode = (props: CodeModeProps) => {
  const { program, varBindings, context } = props;

  // hookLogChanges({program, varBindings}, 'slot:runCodeMode');

  const { referenceValuesP, subResults } = hookFancyCodeEditor({ code: program.code, subPrograms: program.subPrograms, varBindings, context });

  const compiledP = hookMemo(() => EngraftPromise.try(() => {
    if (program.code === '') {
      throw new Error("Empty code");
    }

    // TODO: `__inst_lineNum`s are multiplying
    // TODO: async function bodies? low priority
    // TODO: double-parsing isn't great
    let transformed: string;
    try {
      transformed = transformBodyCached(`return ( ${program.code} )`).code!;
    } catch {
      transformed = transformBodyCached(`return do { ${program.code} }`).code!;
    }
    return compileBodyCached(transformed);
  }), [program.code])

  const outputAndLogsP = hookMemo(() => {
    return EngraftPromise.all(compiledP, referenceValuesP).then(([compiled, codeReferenceScope]) => {
      // To manage logs, we keep one special global:
      //   __log: A function which logs using the active slot's line numbers and logs array.

      // TODO: This "temporarily reset global logger" setup doesn't work with asynchronicity at all.
      //   (IDK how to do dynamic scope with asynchronicity...)

      let lineNum = 1;
      let logs: {lineNum: number, text: string}[] = [];

      // Reset the global logger to user our versions of `lineNum` and `logs`.
      (globalThis as any).__log = (...vals: any[]) => {
        const text = vals.map((v) => objectInspect(v)).join(", ");
        logs.push({lineNum, text});
        return vals[vals.length - 1];
      };

      const __inst_lineNum = (newLineNum: number) => {
        lineNum = newLineNum;
      };
      const log = (...vals: any[]) => {
        (globalThis as any).__log(...vals);
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
  }, [compiledP, referenceValuesP]);

  const outputP = hookMemo(() => {
    return outputAndLogsP.then(([output, _]) => output);
  }, [outputAndLogsP]);

  const logsP = hookMemo(() => {
    return outputAndLogsP.then(([_, logs]) => logs);
  }, [outputAndLogsP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((viewProps) =>
      <CodeModeView
        {...props} {...viewProps} updateProgram={viewProps.updateProgram as Updater<Program, ProgramCodeMode>}
        subResults={subResults}
        logsP={logsP}
      />
    ),
  }), [props]);

  return {outputP, view};
};

type CodeModeViewProps = CodeModeProps & ToolViewRenderProps<Program> & {
  subResults: {[id: string]: ToolResult},
  logsP: EngraftPromise<{lineNum: number, text: string}[]>,
  updateProgram: Updater<Program, ProgramCodeMode>,
};

const CodeModeView = memo(function CodeModeView(props: CodeModeViewProps) {
  const {program, varBindings, context, updateProgram, expand, autoFocus, onBlur, subResults, logsP} = props;
  const programUP = useUpdateProxy(updateProgram);

  const [showInspector, setShowInspector] = useState(false);

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

  // stuff we need to put back in:
  const extensions = useMemo(() => {
    return [
      javascript({jsx: true}),
      keymap.of([
        {key: 'Shift-Mod-i', run: () => { setShowInspector((showInspector) => !showInspector); return true; }},
      ]),
      logTheme,
      logDecorations,
    ];
  }, [logDecorations]);

  const replaceWithProgram = useCallback((newProgram: ToolProgram) => {
    programUP.$as<ToolProgram>().$set(context.makeSlotWithProgram(newProgram, program.defaultCode));
  }, [program.defaultCode, programUP, context]);

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
      <FancyCodeEditor
        context={context}
        defaultCode={program.defaultCode}
        extensions={extensions}
        autoFocus={autoFocus}
        code={program.code}
        codeUP={programUP.code}
        subPrograms={program.subPrograms}
        subProgramsUP={programUP.subPrograms}
        onBlur={onBlur}
        replaceWithProgram={replaceWithProgram}
        varBindings={varBindings}
        subResults={subResults}
      />
      <ToolInspectorWindow
        show={showInspector}
        onClose={() => {setShowInspector(false)}}
        program={program}
        updateProgram={updateProgram as any}
        varBindings={varBindings}
        context={context}
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
  const { program, varBindings, context } = props;

  const { outputP: subOutputP, view: subView } = hookRunTool({ program: program.subProgram, varBindings, context });

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((renderProps) => <ToolModeView
      {...props} {...renderProps} updateProgram={renderProps.updateProgram as Updater<Program, ProgramToolMode>}
      subView={subView}
    />),
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
  const {program, varBindings, updateProgram, context, expand, autoFocus, noFrame, subView, onBlur} = props;
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

  const [frameBarBackdropElem, setFrameBarBackdropElem] = useState<HTMLDivElement | undefined>(undefined) ;

  if (noFrame) {
    return <ShowView view={subView} updateProgram={updateSubProgram} autoFocus={autoFocus} />;
  } else {
    return <ToolFrame
      expand={expand}
      program={program.subProgram} updateProgram={updateSubProgram} varBindings={varBindings} context={context}
      setFrameBarBackdropElem={setFrameBarBackdropElem}
      onClose={onCloseFrame}
    >
      <ShowView
        view={subView}
        updateProgram={updateSubProgram}
        autoFocus={autoFocus}
        frameBarBackdropElem={frameBarBackdropElem}
        onBlur={onBlur}
      />
    </ToolFrame>;
  }
});
