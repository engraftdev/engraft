import {
  ComputeReferences, EngraftPromise, hookRunTool, ProgramFactory, references, ShowView, ToolOutput, ToolProgram,
  ToolProps, ToolRun, ToolView
} from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { slotSetTo } from "../../builtin-tools/slot";
import { RowToCol } from "../../util/RowToCol";
import { union } from "@engraft/shared/src/sets";
import { UseUpdateProxy } from "@engraft/update-proxy-react";

export type Program = {
  toolName: "request";
  urlProgram: ToolProgram;
  paramsProgram: ToolProgram;
  pauseRequest: boolean;
};

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: "request",
    urlProgram: slotSetTo('"https://httpbin.org/get"'),
    paramsProgram: slotSetTo(paramsDefault),
    pauseRequest: false,
  };
};
const paramsDefault = `{
  my_param: "hello world!"
}`;

export const computeReferences: ComputeReferences<Program> = (program) =>
  union(references(program.urlProgram), references(program.paramsProgram));

export const run: ToolRun<Program> = memoizeProps(
  hooks((props: ToolProps<Program>) => {
    const { program, varBindings } = props;

    const urlResult = hookRunTool({program: program.urlProgram, varBindings});
    const paramsResult = hookRunTool({program: program.paramsProgram, varBindings});

    const outputP = hookMemo(
      () =>
        EngraftPromise.all([urlResult.outputP, paramsResult.outputP]).then(
          async ([urlOutput, paramsOutput]) => {
            if (program.pauseRequest) {
              return EngraftPromise.unresolved<ToolOutput>();
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
      [urlResult.outputP, paramsResult.outputP, program.pauseRequest]
    );

    const view: ToolView<Program> = hookMemo(
      () => ({
        render: ({updateProgram}) => (
          <UseUpdateProxy updater={updateProgram} children={(programUP) =>
            <div className="xCol xGap10 xPad10 xWidthFitContent">
              <RowToCol minRowWidth={200} className="xGap10" autoFocus={true}>
                <b>url</b> <ShowView view={urlResult.view} updateProgram={programUP.urlProgram.$apply} />
              </RowToCol>
              <RowToCol minRowWidth={200} className="xGap10">
                <b>params</b> <ShowView view={paramsResult.view} updateProgram={programUP.paramsProgram.$apply} />
              </RowToCol>
              <div>
                <input
                  type="checkbox"
                  checked={program.pauseRequest}
                  onChange={() =>
                    programUP.pauseRequest.$apply((pauseRequest) => !pauseRequest)
                  }
                ></input>
                Pause request
              </div>
            </div>
          } />
        ),
      }),
      [urlResult.view, paramsResult.view, program.pauseRequest]
    );

    return { view, outputP };
  })
);
