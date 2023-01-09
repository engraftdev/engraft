import React, { memo, ReactNode, useEffect, useMemo, useReducer } from "react";
import { references, ProgramFactory, ComputeReferences, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'debug-seeing-double',
  subProgram: ToolProgram,
  rerenderOn: boolean,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'debug-seeing-double',
  subProgram: slotSetTo(''),
  rerenderOn: false,
});

export const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.subProgram);

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [subComponent, subView, subOutput] = useSubTool({program, updateProgram, subKey: 'subProgram', varBindings});
  const [rerenderOn, updateRerenderOn] = useAt(program, updateProgram, 'rerenderOn');

  useOutput(reportOutput, subOutput);

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPad10">
        <ShowView view={subView} />
        { rerenderOn
        ? <RerenderOn value={program.subProgram}>
            <ShowView view={subView} />
          </RerenderOn>
        : <ShowView view={subView} />
        }
        <div className="xRow xGap10">
          <input type="checkbox" checked={rerenderOn} onChange={(e) => updateRerenderOn(() => e.target.checked)} />
          <span>rerender view 2 on program change</span>
        </div>
      </div>
  }), [program.subProgram, rerenderOn, subView, updateRerenderOn]));

  return <>
    {subComponent}
  </>
});

const RerenderOn = memo(({value, children}: {value: unknown, children: ReactNode}) => {
  const [version, incrementVersion] = useReducer((version) => version + 1, 0);
  useEffect(incrementVersion, [value, incrementVersion]);

  return <React.Fragment key={version}>{children}</React.Fragment>;
});
