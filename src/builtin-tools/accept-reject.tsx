import _ from "lodash";
import { cloneElement, memo, useMemo } from "react";
import { ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'accept-reject',
  acceptedProgram: ToolProgram,
  draftProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'accept-reject',
  acceptedProgram: slotSetTo(defaultCode || ''),
  draftProgram: slotSetTo(defaultCode || ''),
});

const check = <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="feather feather-check-circle"
  >
  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
  <polyline points="22 4 12 14.01 9 11.01"></polyline>
</svg>;

const xMark = <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="feather feather-x-circle"
  >
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="15" y1="9" x2="9" y2="15"></line>
  <line x1="9" y1="9" x2="15" y2="15"></line>
</svg>;

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [acceptedComponent, _acceptedView, acceptedOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'acceptedProgram'});
  const [draftComponent, draftView, _draftOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'draftProgram'});

  useOutput(reportOutput, acceptedOutput);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xPad10">
        <ShowView view={draftView} />
        {!_.eq(program.acceptedProgram, program.draftProgram) &&
          <div className="xRow">
            <button
              onClick={() => updateProgram((old) => ({...old, acceptedProgram: old.draftProgram}))}
              style={{all: 'unset'}}
            >
              {cloneElement(check, {width: 20, style: {color: 'green', cursor: 'pointer'}})}
            </button>
            <button
              onClick={() => updateProgram((old) => ({...old, draftProgram: old.acceptedProgram}))}
              style={{all: 'unset'}}
            >
              {cloneElement(xMark, {width: 20, style: {color: 'red', cursor: 'pointer'}})}
            </button>
          </div>
        }
      </div>
  }), [draftView, program.acceptedProgram, program.draftProgram, updateProgram]));

  return <>
    {acceptedComponent}
    {draftComponent}
  </>
});
