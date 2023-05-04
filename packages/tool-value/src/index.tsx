import { ComputeReferences, defineTool, hookMemo, hookRunTool, hooks, memoizeProps, outputBackgroundStyle, ProgramFactory, references, ShowView, slotWithCode, ToolOutputView, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, useUpdateProxy } from "@engraft/toolkit";
import { memo, useCallback, useState } from "react";
import { createPortal } from "react-dom";

export type Program = {
  toolName: 'value',
  subProgram: ToolProgram,
}

const programFactory: ProgramFactory<Program> = (defaultInputCode) => ({
  toolName: 'value',
  subProgram: slotWithCode(defaultInputCode),
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
      <ToolOutputView outputP={subResult.outputP} />
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
