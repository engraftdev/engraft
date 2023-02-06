import { slotSetTo } from "src/builtin-tools/slot";
import { RowToCol } from "src/util/RowToCol";
import { union } from "src/util/sets";
import {
  references,
  ProgramFactory,
  ComputeReferences,
  ToolProgram,
  ToolProps,
  ToolView,
  ToolRun,
} from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookRunSubTool } from "src/engraft/hooks";
import { ShowView } from "src/engraft/ShowView";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { hookMemo } from "src/incr/hookMemo";
import { hookAt } from "src/util/immutable-incr";

export type Program = {
  toolName: "request";
  urlProgram: ToolProgram;
  paramsProgram: ToolProgram;
  autoSend: boolean;
};

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: "request",
    urlProgram: slotSetTo("{}"),
    paramsProgram: slotSetTo(paramsDefault),
    autoSend: true,
  };
};
const paramsDefault = `{
  my_param: "hello world!"
}`;

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.urlProgram), references(program.paramsProgram));

export const run: ToolRun<Program> = memoizeProps(
  hooks((props: ToolProps<Program>) => {
    const { program, updateProgram, varBindings } = props;
    const [autoSend, toggleAutosend] = hookAt(
      program,
      updateProgram,
      "autoSend"
    );

    const { view: urlView, outputP: urlOutputP } = hookRunSubTool({
      program,
      updateProgram,
      subKey: "urlProgram",
      varBindings,
    });

    const { view: paramsView, outputP: paramsOutputP } = hookRunSubTool({
      program,
      updateProgram,
      subKey: "paramsProgram",
      varBindings,
    });

    const outputP = hookMemo(
      () =>
        EngraftPromise.all([urlOutputP, paramsOutputP]).then(
          async ([urlOutput, paramsOutput]) => {
            if (autoSend) {
              return { value: null };
            }
            if (typeof urlOutput.value !== "string") {
              throw new Error("url must be a string");
            }
            if (
              typeof paramsOutput.value !== "object" ||
              paramsOutput.value === null
            ) {
              throw new Error("params must be an object");
            }
            const urlObj = new URL(urlOutput.value);
            Object.entries(paramsOutput.value).forEach(([k, v]) =>
              urlObj.searchParams.append(
                k,
                typeof v === "string" ? v : JSON.stringify(v as any)
              )
            );
            const resp = await fetch(urlObj.toString());
            const data: unknown = await resp.json();
            return { value: data };
          }
        ),
      [urlOutputP, paramsOutputP, autoSend]
    );

    const view: ToolView = hookMemo(
      () => ({
        render: () => (
          <>
            <div className="xCol xGap10 xPad10 xWidthFitContent">
              <RowToCol minRowWidth={200} className="xGap10" autoFocus={true}>
                <b>url</b> <ShowView view={urlView} />
              </RowToCol>
              <RowToCol minRowWidth={200} className="xGap10">
                <b>params</b> <ShowView view={paramsView} />
              </RowToCol>
              <div>
                <input
                  type="checkbox"
                  checked={autoSend}
                  onChange={() => toggleAutosend((autoSend) => !autoSend)}
                ></input>
                Pause request
              </div>
            </div>
          </>
        ),
      }),
      [urlView, paramsView, autoSend]
    );

    return { view, outputP };
  })
);
