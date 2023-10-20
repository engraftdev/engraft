import { hookRunTool, ShowView, slotWithCode, Tool, ToolProgram, ToolView } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { UseUpdateProxy } from "@engraft/update-proxy-react";
import { Fragment, memo, ReactNode, useEffect, useReducer } from "react";

export type Program = {
  toolName: 'test-seeing-double',
  subProgram: ToolProgram,
  rerenderOnProgramChange: boolean,
}

export const tool: Tool<Program> = {
  name: 'test-seeing-double',

  makeProgram: () => ({
    toolName: 'test-seeing-double',
    subProgram: slotWithCode(''),
    rerenderOnProgramChange: false,
  }),

  collectReferences: (program) => program.subProgram,

  run: memoizeProps(hooks((props) => {
    const { program, varBindings } = props;

    const { outputP: subOutputP, view: subView } = hookRunTool({program: program.subProgram, varBindings});

    const outputP = subOutputP;

    const view: ToolView<Program> = hookMemo(() => ({
      render: ({updateProgram}) =>
        <UseUpdateProxy updater={updateProgram} children={(programUP) =>
          <div className="xCol xGap10 xPad10">
            <ShowView view={subView} updateProgram={programUP.subProgram.$apply} />
            { program.rerenderOnProgramChange
            ? <RerenderOn value={program.subProgram}>
                <ShowView view={subView} updateProgram={programUP.subProgram.$apply} />
              </RerenderOn>
            : <ShowView view={subView} updateProgram={programUP.subProgram.$apply} />
            }
            <div className="xRow xGap10">
              <input
                type="checkbox"
                checked={program.rerenderOnProgramChange}
                onChange={(e) => programUP.rerenderOnProgramChange.$set(e.target.checked)}
              />
              <span>rerender view 2 on program change</span>
            </div>
          </div>
        } />
    }), [program.subProgram, program.rerenderOnProgramChange, subView]);

    return { outputP, view };
  })),
};

const RerenderOn = memo(({value, children}: {value: unknown, children: ReactNode}) => {
  const [version, incrementVersion] = useReducer((version) => version + 1, 0);
  useEffect(incrementVersion, [value, incrementVersion]);

  return <Fragment key={version}>{children}</Fragment>;
});
