import { ComputeReferences, ProgramFactory, ToolRun } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { ControlledTextInput } from 'src/util/ControlledTextInput';
import { hookAt } from 'src/util/immutable-mento';

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
  const { program, updateProgram} = props;
  const [ packageName, updatePackageName ] = hookAt(program, updateProgram, 'packageName');

  // TODO: debouncing?
  // all sorts of caching, error detection, etc.
  // package search
  // automatic .default?

  const outputP = hookMemo(() => EngraftPromise.try(() => {
    // TODO: The `import` below doesn't work in lib2 output... hmm...
    // const url = `https://cdn.skypack.dev/${name}`;
    const url = `https://esm.sh/${packageName}`;
    return import(/*webpackIgnore: true*/ url).then((module) => ({value: module}));
  }), [packageName]);

  const view = hookMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>name</b> <ControlledTextInput value={packageName} onChange={(ev) => updatePackageName(() => ev.target.value)} />
        </div>
      </div>
  }), [packageName, updatePackageName]);

  return { outputP, view };
}));
