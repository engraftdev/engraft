import { BabelFileResult } from '@babel/core';
import { transform } from '@babel/standalone';
import { autocompletion, CompletionContext, CompletionSource } from "@codemirror/autocomplete";
import { javascript } from '@codemirror/lang-javascript';
import { keymap } from '@codemirror/view';
import _ from 'lodash';
import { memo, useCallback, useMemo, useState } from "react";
import ReactDOM from 'react-dom';
import { cN } from 'src/deps';
import { ProgramFactory, references, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewRenderProps, VarBinding, VarBindings } from "src/engraft";
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { hookRunSubTool } from 'src/engraft/hooks';
import { ShowView } from 'src/engraft/ShowView';
import { hookMemo } from 'src/mento/hookMemo';
import { hookFork, hookForkLater, hooks } from 'src/mento/hooks';
import { memoizeProps } from 'src/mento/memoize';
import CodeMirror from 'src/util/CodeMirror';
import { setup } from "src/util/codeMirrorStuff";
import { compileExpressionCached } from "src/util/compile";
import { embedsExtension } from 'src/util/embedsExtension';
import { idRegExp } from 'src/util/id';
import { Updater } from 'src/util/immutable';
import { useAt } from 'src/util/immutable-react';
import { OrError } from 'src/util/OrError';
import { usePortalSet } from 'src/util/PortalWidget';
import { makeRand } from 'src/util/rand';
import { Replace } from 'src/util/types';
import { updateF } from 'src/util/updateF';
import { useRefForCallback } from 'src/util/useRefForCallback';
import { ToolFrame } from 'src/view/ToolFrame';
import { ToolInspectorWindow } from 'src/view/ToolInspectorWindow';
import { VarUse } from 'src/view/Vars';
import { globals } from './globals';

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
        { modeName: 'code', code: program, defaultCode: program }:
        { modeName: 'tool', subProgram: program, defaultCode: undefined }
    )
  };
}

export const computeReferences = (program: Program) => {
  if (program.modeName === 'code') {
    return referencesFromCode(program.code);
  } else {
    return references(program.subProgram);
  }
};

export function refCode(s: string) {
  // currently, the id of a reference is just embedded directly into code
  return s;
}
export const refRE = new RegExp(refCode(`(${idRegExp})`), "g")

function referencesFromCode(code: string): Set<string> {
  // TODO: this is not principled or robust; should probably actually parse the code?
  // (but then we'd want to share some work to avoid parsing twice? idk)
  return new Set([...code.matchAll(refRE)].map(m => m[1]));
}

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const {program, updateProgram} = props;

  return hookFork((branch) => {
    if (program.modeName === 'code') {
      return branch('code mode', () => {
        return runCodeMode({...props, program, updateProgram: updateProgram as Updater<Program, ProgramCodeMode>});
      });
    } else {
      return branch('tool mode', () => {
        return runToolMode({...props, program, updateProgram: updateProgram as Updater<Program, ProgramToolMode>});
      });
    }
  });
}));


///////////////
// CODE MODE //
///////////////

let _transformCachedCache: {[code: string]: OrError<BabelFileResult>} = {};
function transformCached(code: string) {
  if (!_transformCachedCache[code]) {
    _transformCachedCache[code] = OrError.catch(() => transform(code, { presets: ["react"] }));
  }
  return OrError.throw(_transformCachedCache[code]);
}

type CodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
  updateProgram: Updater<Program, ProgramCodeMode>,
}>

const runCodeMode = (props: CodeModeProps) => {
  const { program, varBindings } = props;

  const compiledP = hookMemo(() => EngraftPromise.try(() => {
    if (program.code === '') {
      throw new Error("Empty code");
    }

    // TODO: better treatment of non-expression code (multiple lines w/return, etc)
    let transformResult = transformCached("(" + program.code + ")");  // might throw
    const translated = transformResult.code!.replace(/;$/, "");
    return compileExpressionCached(translated);  // might throw
  }), [program.code])

  const codeReferences = hookMemo(() => referencesFromCode(program.code), [program.code]);

  const codeReferenceScopeP = hookMemo(() => EngraftPromise.try(() => {
    const codeReferencesArr = Array.from(codeReferences);

    const outputValuePromises = codeReferencesArr.map((ref) => {
      const binding = varBindings[ref] as VarBinding | undefined;
      if (!binding) {
        throw new Error(`Unknown reference ${ref}`);  // caught by promise
      }
      return binding.outputP.catch(() => {
        throw new Error(`Error from reference ${binding.var_.label}`);
      });
    })

    return EngraftPromise.all(outputValuePromises).then((outputValues) => {
      return _.zipObject(codeReferencesArr, outputValues.map((v) => v.value));
    });
  }), [varBindings, codeReferences]);

  const outputP = hookMemo(() => {
    const valueDedupeFork = hookForkLater();

    return EngraftPromise.all(compiledP, codeReferenceScopeP).then(([compiled, codeReferenceScope]) => {
      const rand = makeRand();
      const scope = {
        ...globals,
        ...codeReferenceScope,
        rand
      };
      const outputValueP = EngraftPromise.resolve(compiled(scope));
      const dedupedOutputValueP = outputValueP.then((value) => {
        return valueDedupeFork.branch('dedupe', () => {
          // TODO: extra layer of deduplication of value using deep equality, probably unnecessary / undesired
          const dedupedValue = hookMemo(() => value, [value], _.isEqual);
          return {value: dedupedValue};
        });
      });

      return dedupedOutputValueP;
    })
  }, [compiledP, codeReferenceScopeP]);

  const view = hookMemo(() => ({
    render: (viewProps: ToolViewRenderProps) =>
      <CodeModeView
        {...props} {...viewProps}
      />
  }), [props]);

  return {outputP, view};
};

type CodeModeViewProps = CodeModeProps & ToolViewRenderProps;

const CodeModeView = memo(function CodeModeView(props: CodeModeViewProps) {
  const {program, varBindings, updateProgram, expand, autoFocus} = props;
  const varBindingsRef = useRefForCallback(varBindings);

  const [showInspector, setShowInspector] = useState(false);

  const [refSet, refs] = usePortalSet<{id: string}>();

  const extensions = useMemo(() => {
    const completions = [
      refCompletions(() => varBindingsRef.current),
    ];
    return [
      ...setup,
      javascript({jsx: true}),
      keymap.of([
        {key: 'Shift-Mod-i', run: () => { setShowInspector((showInspector) => !showInspector); return true; }},
      ]),
      embedsExtension(refSet, refRE),
      autocompletion({override: completions}),
    ];
  }, [refSet, varBindingsRef])

  const onChange = useCallback((value: string) => {
    updateProgram(updateF({code: {$set: value}}));
  }, [updateProgram]);

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
          <VarUse key={id} varBinding={varBindings[id] as VarBinding | undefined} />,
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
        apply: refCode(varBinding.var_.id),
      })),
    }
  };
}


///////////////
// TOOL MODE //
///////////////

type ToolModeProps = Replace<ToolProps<Program>, {
  program: ProgramToolMode,
  updateProgram: Updater<Program, ProgramToolMode>,
}>

const runToolMode = (props: ToolModeProps) => {
  const { program, updateProgram, varBindings } = props;

  const { outputP: subOutputP, view: subView } = hookRunSubTool({ program, updateProgram, varBindings, subKey: 'subProgram' });

  const view = hookMemo(() => ({
    render: () => <ToolModeView {...props} subView={subView} />
  }), [subView]);

  return { outputP: subOutputP, view };
};

type ToolModeViewProps = ToolModeProps & ToolViewRenderProps & {
  subView: ToolView,
};

const ToolModeView = memo(function ToolModeView(props: ToolModeViewProps) {
  const {program, varBindings, updateProgram, expand, autoFocus, noFrame, subView} = props;

  const [subProgram, updateSubProgram] = useAt(program, updateProgram, 'subProgram');

  const onCloseFrame = useCallback(() => {
    updateProgram(() => ({
      toolName: 'slot',
      modeName: 'code',
      code: program.defaultCode || '',
      subTools: {},
      defaultCode: program.defaultCode,
    }));
  }, [program.defaultCode, updateProgram]);

  if (noFrame) {
    return <ShowView view={subView} autoFocus={autoFocus} />;
  } else {
    return <ToolFrame
      expand={expand}
      program={subProgram} updateProgram={updateSubProgram} varBindings={varBindings}
      onClose={onCloseFrame}
    >
      <ShowView view={subView} autoFocus={autoFocus} />
    </ToolFrame>;
  }
});
