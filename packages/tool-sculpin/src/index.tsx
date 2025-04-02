import {
  CollectReferences,
  defineTool,
  EngraftPromise,
  ErrorView,
  hookMemo,
  hookRef,
  hookRunTool,
  hooks,
  inputFrameBarBackdrop,
  InputHeading,
  MakeProgram,
  memoizeProps,
  renderWithReact,
  ShowView,
  ToolProgram,
  ToolProps,
  ToolView,
  ToolViewRenderProps,
  up,
  usePromiseState,
} from "@engraft/toolkit";
import _ from "lodash";
import { ProgramEditor } from "moldable-json";
import { tag_data, untag_data } from "moldable-json/lib/data.js";
import {
  Program as SculpinScript,
  run_program,
  Trace,
  World,
} from "moldable-json/lib/interpreter.js";
import { empty_selection } from "moldable-json/lib/selection.js";
import { memo } from "react";
import { createPortal } from "react-dom";

export type Program = {
  toolName: "sculpin";
  inputProgram: ToolProgram;
  setInputProgram: ToolProgram;
  sculpinScript: SculpinScript;
  returnAsView: boolean;
};

const makeProgram: MakeProgram<Program> = (context, defaultCode) => ({
  toolName: "sculpin",
  inputProgram: context.makeSlotWithCode(defaultCode),
  setInputProgram: context.makeSlotWithCode(""),
  sculpinScript: { steps: [] },
  returnAsView: false,
});

const collectReferences: CollectReferences<Program> = (program) => [
  program.inputProgram,
  program.setInputProgram,
];

const run = memoizeProps(
  hooks((props: ToolProps<Program>) => {
    const { program, varBindings, context } = props;

    const inputResult = hookRunTool({
      program: program.inputProgram,
      varBindings,
      context,
    });
    const setInputResult = hookRunTool({
      program: program.setInputProgram,
      varBindings,
      context,
    });

    const trace_ref = hookRef<Trace | undefined>(() => undefined);

    const setInputProgramIsEmpty = _.isEqual(
      program.setInputProgram,
      context.makeSlotWithCode(""),
    );

    const outputP = hookMemo(
      () =>
        EngraftPromise.all([
          inputResult.outputP,
          setInputProgramIsEmpty ? undefined : setInputResult.outputP,
        ]).then(async ([inputOutput, setInputOutput]) => {
          const tagged = tag_data(inputOutput!.value);

          if (program.returnAsView) {
            return {
              value: (
                <ProgramEditor
                  force_run_mode={true}
                  input={tagged}
                  program_and_redo_stack={{
                    program: program.sculpinScript,
                    redo_stack: [],
                  }}
                  set_input={(tagged_data) => {
                    if (!setInputOutput) return;
                    const data = untag_data(tagged_data);
                    (setInputOutput.value as any)(data);
                  }}
                  set_program_and_redo_stack={() => {}}
                />
              ),
            };
          } else {
            const world: World = {
              data: tagged,
              selection: empty_selection(),
              active_tag: "primary",
            };

            const trace = await run_program(
              world,
              program.sculpinScript,
              trace_ref.current,
            );
            trace_ref.current = trace;
            return { value: untag_data(trace.worlds.at(-1)!.data) };
          }
        }),
      [
        inputResult.outputP,
        program.returnAsView,
        program.sculpinScript,
        setInputProgramIsEmpty,
        setInputResult.outputP,
        trace_ref,
      ],
    );

    const view: ToolView<Program> = hookMemo(
      () => ({
        render: renderWithReact((renderProps) => (
          <View
            {...props}
            {...renderProps}
            inputResult={inputResult}
            setInputResult={setInputResult}
          />
        )),
      }),
      [props, inputResult, setInputResult],
    );

    return { outputP, view };
  }),
);

export default defineTool({
  name: "sculpin",
  makeProgram,
  collectReferences,
  run,
});

type ViewProps = ToolProps<Program> &
  ToolViewRenderProps<Program> & {
    inputResult: ReturnType<typeof hookRunTool>;
    setInputResult: ReturnType<typeof hookRunTool>;
  };

const View = memo((props: ViewProps) => {
  const {
    inputResult,
    setInputResult,
    updateProgram,
    autoFocus,
    frameBarBackdropElem,
    program,
  } = props;
  const programUP = up(updateProgram);

  const inputState = usePromiseState(inputResult.outputP);
  const setInputState = usePromiseState(setInputResult.outputP);

  return (
    <div className="xCol" style={{ minWidth: 500, minHeight: 800 }}>
      {frameBarBackdropElem &&
        createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <InputHeading
        slot={
          <div className="xRow xGap10">
            <ShowView
              view={inputResult.view}
              updateProgram={programUP.inputProgram.$}
              autoFocus={autoFocus}
            />
            <ShowView
              view={setInputResult.view}
              updateProgram={programUP.setInputProgram.$}
              autoFocus={autoFocus}
            />
            <input
              type="checkbox"
              checked={program.returnAsView}
              onChange={(ev) => programUP.returnAsView.$set(ev.target.checked)}
            />
          </div>
        }
      />
      <div className="xRow" style={{ flexGrow: 1 }}>
        {inputState.status === "pending" && <div>loading...</div>}
        {inputState.status === "rejected" && (
          <ErrorView error={inputState.reason} />
        )}
        {inputState.status === "fulfilled" && (
          <ProgramEditor
            input={tag_data(inputState.value.value)}
            program_and_redo_stack={{
              program: program.sculpinScript,
              redo_stack: [],
            }}
            set_input={
              setInputState.status === "fulfilled"
                ? (tagged_data) => {
                    const data = untag_data(tagged_data);
                    console.log("set_input", tagged_data, data);
                    (setInputState.value.value as any)(data);
                  }
                : () => {}
            }
            set_program_and_redo_stack={(setter) => {
              programUP.sculpinScript.$((oldSculpinScript) => {
                const newProgramAndRedoStack =
                  typeof setter === "function"
                    ? setter({ program: oldSculpinScript, redo_stack: [] })
                    : setter;
                return newProgramAndRedoStack.program;
              });
            }}
          />
        )}
      </div>
    </div>
  );
});
