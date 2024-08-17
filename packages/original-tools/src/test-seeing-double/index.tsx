import { hookMemo, hookRunTool, hooks, memoizeProps, renderWithReact, ShowView, Tool, ToolProgram, ToolView, up } from "@engraft/toolkit";
import { Fragment, memo, ReactNode, useEffect, useReducer } from "react";

export type Program = {
  toolName: 'test-seeing-double',
  subProgram: ToolProgram,
  rerenderOnProgramChange: boolean,
}

export const tool: Tool<Program> = {
  name: 'test-seeing-double',

  makeProgram: (context) => ({
    toolName: 'test-seeing-double',
    subProgram: context.makeSlotWithCode(''),
    rerenderOnProgramChange: false,
  }),

  collectReferences: (program) => program.subProgram,

  run: memoizeProps(hooks((props) => {
    const { program, varBindings, context } = props;

    const { outputP: subOutputP, view: subView } = hookRunTool({program: program.subProgram, varBindings, context});

    const outputP = subOutputP;

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact(({updateProgram}) => {
        const programUP = up(updateProgram);
        return <div className="xCol xGap10 xPad10">
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
        </div>;
      }),
    }), [program.subProgram, program.rerenderOnProgramChange, subView]);

    return { outputP, view };
  })),
};

const RerenderOn = memo(({value, children}: {value: unknown, children: ReactNode}) => {
  const [version, incrementVersion] = useReducer((version) => version + 1, 0);
  useEffect(incrementVersion, [value, incrementVersion]);

  return <Fragment key={version}>{children}</Fragment>;
});
