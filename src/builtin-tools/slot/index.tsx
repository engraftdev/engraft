import { BabelFileResult } from '@babel/core';
import { transform } from '@babel/standalone';
import { javascript } from '@codemirror/lang-javascript';
import { keymap } from '@codemirror/view';
import _ from 'lodash';
import { memo, useCallback, useMemo, useState } from "react";
import { cN } from 'src/deps';
import { ProgramFactory, ToolProps, ToolRun, ToolViewRenderProps } from "src/engraft";
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { EngraftStream } from 'src/engraft/EngraftStream';
import { hookMemo } from 'src/mento/hookMemo';
import { hookFork, hookForkLater, hooks } from 'src/mento/hooks';
import { memoizeProps } from 'src/mento/memoize';
import CodeMirror from 'src/util/CodeMirror';
import { setup } from "src/util/codeMirrorStuff";
import { compileExpressionCached } from "src/util/compile";
import { Updater } from 'src/util/immutable';
import { OrError } from 'src/util/OrError';
import { makeRand } from 'src/util/rand';
import { Replace } from 'src/util/types';
import { updateF } from 'src/util/updateF';
import { ToolInspectorWindow } from 'src/view/ToolInspectorWindow';
import { globals } from './globals';

export type Program = ProgramCodeMode;

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

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'slot',
  modeName: 'code',
  defaultCode,
  code: '',
});

export const computeReferences = (program: Program) => new Set();

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const {program, updateProgram} = props;

  return hookFork((branch) => {
    if (program.modeName === 'code') {
      return branch('code mode', () => {
        return runCodeMode({...props, program, updateProgram: updateProgram as Updater<Program, ProgramCodeMode>});
      });
    } else {
      throw new Error("TODO: implement tool mode");
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
  const { program } = props;

  const compiledP = hookMemo(() => EngraftPromise.try(() => {
    if (program.code === '') {
      throw new Error("Empty code");
    }

    // TODO: better treatment of non-expression code (multiple lines w/return, etc)
    let transformResult = transformCached("(" + program.code + ")");  // might throw
    const translated = transformResult.code!.replace(/;$/, "");
    return compileExpressionCached(translated);  // might throw
  }), [program.code])

  const outputP = hookMemo(() => {
    const valueDedupeFork = hookForkLater();

    return compiledP.then((compiled) => {
      const rand = makeRand();
      const scope = {
        ...globals,
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
  }, [compiledP]);

  const viewS = hookMemo(() => EngraftStream.of({
    render: (viewProps: ToolViewRenderProps) =>
      <CodeModeView
        {...props} {...viewProps}
      />
  }), [props]);

  return {outputP, viewS};
};

type CodeModeViewProps = CodeModeProps & ToolViewRenderProps;

const CodeModeView = memo(function CodeModeView(props: CodeModeViewProps) {
  const {program, varBindings, updateProgram, expand, autoFocus} = props;

  const [showInspector, setShowInspector] = useState(false);

  const extensions = useMemo(() => {
    return [
      ...setup,
      javascript({jsx: true}),
      keymap.of([
        {key: 'Shift-Mod-i', run: () => { setShowInspector((showInspector) => !showInspector); return true; }},
      ]),
    ];
  }, [])

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
