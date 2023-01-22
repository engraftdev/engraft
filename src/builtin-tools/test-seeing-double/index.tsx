import { Fragment, memo, ReactNode, useEffect, useReducer } from "react";
import { references, Tool, ToolProgram } from "src/engraft";
import { hookRunSubTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { hookAt } from "src/util/immutable-mento";
import { slotSetTo } from "../slot";

export type Program = {
  toolName: 'debug-seeing-double',
  subProgram: ToolProgram,
  rerenderOnProgramChange: boolean,
}

export const tool: Tool<Program> = {
  programFactory: () => ({
    toolName: 'debug-seeing-double',
    subProgram: slotSetTo(''),
    rerenderOnProgramChange: false,
  }),

  computeReferences: (program) => references(program.subProgram),

  run: memoizeProps(hooks((props) => {
    const { program, updateProgram, varBindings } = props;

    const { outputP: subOutputP, view: subView } = hookRunSubTool({program, updateProgram, subKey: 'subProgram', varBindings});
    const [rerenderOnProgramChange, updateRerenderOnProgramChange] = hookAt(program, updateProgram, 'rerenderOnProgramChange');

    const outputP = subOutputP;

    const view = hookMemo(() => ({
      render: () =>
        <div className="xCol xGap10 xPad10">
          <ShowView view={subView} />
          { rerenderOnProgramChange
          ? <RerenderOn value={program.subProgram}>
              <ShowView view={subView} />
            </RerenderOn>
          : <ShowView view={subView} />
          }
          <div className="xRow xGap10">
            <input
              type="checkbox"
              checked={rerenderOnProgramChange}
              onChange={(e) => updateRerenderOnProgramChange(() => e.target.checked)}
            />
            <span>rerender view 2 on program change</span>
          </div>
        </div>
    }), [program.subProgram, rerenderOnProgramChange, subView, updateRerenderOnProgramChange]);

    return { outputP, view };
  })),
};

const RerenderOn = memo(({value, children}: {value: unknown, children: ReactNode}) => {
  const [version, incrementVersion] = useReducer((version) => version + 1, 0);
  useEffect(incrementVersion, [value, incrementVersion]);

  return <Fragment key={version}>{children}</Fragment>;
});
