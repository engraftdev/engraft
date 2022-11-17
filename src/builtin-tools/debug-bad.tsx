import { memo, useMemo, useState } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useView } from "src/tools-framework/useSubTool";

export type Program = {
  toolName: 'debug-bad',
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'debug-bad',
});

export const Component = memo((props: ToolProps<Program>) => {
  const [ goneBad, setGoneBad ] = useState(false);

  if (goneBad) {
    throw new Error('the bad tool threw an error');
  }

  useView(props.reportView, useMemo(() => ({
    render: () =>
      <div className="xPad10">
        <button onClick={() => setGoneBad(true)}>
          go bad
        </button>
      </div>
  }), []));

  return <></>;
});
