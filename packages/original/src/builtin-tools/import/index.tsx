import { ComputeReferences, ProgramFactory, ToolRun, ToolView } from "../../engraft";
import { EngraftPromise } from "../../engraft/EngraftPromise";
import { hookMemo } from "../../incr/hookMemo";
import { hooks } from "../../incr/hooks";
import { memoizeProps } from "../../incr/memoize";
import { ControlledTextInput } from '../../util/ControlledTextInput';
import { UseUpdateProxy } from "../../util/UpdateProxy.react";

export type Program = {
  toolName: 'npm',
  packageName: string,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'npm',
  packageName: '',
});

export const computeReferences: ComputeReferences<Program> = (program) => new Set();

export const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program } = props;

  // TODO: debouncing?
  // all sorts of caching, error detection, etc.
  // package search
  // automatic .default?

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    // TODO: The `import` below doesn't work in lib2 output... hmm...
    // const url = `https://cdn.skypack.dev/${name}`;
    const url = `https://esm.sh/${program.packageName}`;
    return import(/* @vite-ignore */ url).then((module) => ({value: module}));
  }), [program.packageName]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: ({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>name</b> <ControlledTextInput value={program.packageName} onChange={(ev) => programUP.packageName.$set(ev.target.value)} />
          </div>
        </div>
      } />
  }), [program.packageName]);

  return { outputP, view };
}));
