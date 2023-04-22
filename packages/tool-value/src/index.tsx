import { ToolOutputView, Value } from "@engraft/original/lib/view/Value.js";
import { ComputeReferences, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, outputBackgroundStyle, ProgramFactory, references, ShowView, slotWithCode, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, useUpdateProxy } from "@engraft/toolkit";
import { memo, ReactNode, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export type Program = {
  toolName: 'value',
  subProgram: ToolProgram,
}

const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'value',
  subProgram: slotWithCode(''),
});

const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.subProgram);

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const subResult = hookRunTool({program: program.subProgram, varBindings});

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...props} {...renderProps} subResult={subResult} />,
    showsOwnOutput: true,
  }), [props, subResult]);

  return {outputP: subResult.outputP, view};
}));

export default defineTool({ programFactory, computeReferences, run })

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & { subResult: ToolResult }) => {
  const { updateProgram, subResult, frameBarBackdropElem } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [showTool, setShowTool] = useState(false);

  const [showToolOnLastMouseDown, setShowToolOnLastMouseDown] = useState(false);

  // This logic avoids a problem where...
  // 1. mouse-down blurs the tool, causing setShowTool(false)...
  // 2. mouse-up triggers a click with showTool == false, causing setShowTool(true).

  const onMouseDown = useCallback(() => {
    setShowToolOnLastMouseDown(showTool);
  }, [showTool]);

  const onClick = useCallback(() => {
    if (!showToolOnLastMouseDown) {
      setShowTool(true);
    }
  }, [showToolOnLastMouseDown]);

  return <div onMouseDown={onMouseDown} onClick={onClick}>
    { frameBarBackdropElem && createPortal(
      <div className="backdrop" style={{...outputBackgroundStyle, height: '100%'}} />,
      frameBarBackdropElem
    ) }
    <div style={{...outputBackgroundStyle}}>
      <ToolOutputView
        outputP={subResult.outputP}
        valueWrapper={myValueWrapper}
      />
    </div>
    { showTool &&
      <ShowView
        view={subResult.view}
        updateProgram={programUP.subProgram.$apply}
        autoFocus={true}
        onBlur={() => {
          setShowTool(false);
        }}
      />
    }
  </div>
})

// TODO: we're hacking in support for cute little tables; generalization TBD
function myValueWrapper(valueNode: ReactNode, value: unknown) {
  const colSpacing = 10;

  if (value instanceof Array) {
    if (value.length > 0 && value[0] instanceof Array) {
      return <table style={{margin: `${colSpacing / 2}px 0`}}>
        <tbody>
          {value.map((row, i) => <tr key={i}>
            {(row as unknown[]).map((cell, j) => <td key={j} style={{padding: `0 ${colSpacing / 2}px`}}><Value value={cell}/></td>)}
          </tr>)}
        </tbody>
      </table>
    }
  }
  return valueNode;
}
