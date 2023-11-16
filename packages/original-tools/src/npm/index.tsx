import { ControlledTextInput } from "@engraft/shared/lib/ControlledTextInput.js";
import { CollectReferences, EngraftPromise, MakeProgram, ToolRun, ToolView, UseUpdateProxy, defineTool, hookMemo, hooks, memoizeProps, renderWithReact } from "@engraft/toolkit";

type Program = {
  toolName: 'npm',
  packageName: string,
}

const makeProgram: MakeProgram<Program> = () => ({
  toolName: 'npm',
  packageName: '',
});

const collectReferences: CollectReferences<Program> = (_program) => [];

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
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
    render: renderWithReact(({updateProgram}) =>
      <UseUpdateProxy updater={updateProgram} children={(programUP) =>
        <div className="xCol xGap10 xPad10">
          <div className="xRow xGap10">
            <b>name</b> <ControlledTextInput value={program.packageName} onChange={(ev) => programUP.packageName.$set(ev.target.value)} />
          </div>
        </div>
      } />
    ),
  }), [program.packageName]);

  return { outputP, view };
}));

export default defineTool({ name: 'npm', makeProgram, collectReferences, run })
