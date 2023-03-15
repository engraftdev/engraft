import {
  ComputeReferences, EngraftPromise, hookRunTool, ProgramFactory, references, ShowView, slotWithCode, ToolOutput, ToolProgram,
  ToolProps, ToolRun, ToolView, ToolViewRenderProps
} from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { union } from "@engraft/shared/lib/sets.js";
import { useCommonWidth } from "@engraft/toolkit";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { memo, useState } from "react";
import { RowToCol } from "../../util/RowToCol.js";

export type Program = {
  toolName: "request";
  urlProgram: ToolProgram;
  paramsProgram: ToolProgram;
  pauseRequest: boolean;
};

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: "request",
    urlProgram: slotWithCode('"https://httpbin.org/get"'),
    paramsProgram: slotWithCode(paramsDefault),
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
        render: (renderProps) =>
          <View
            {...props}
            {...renderProps}
            urlView={urlResult.view}
            paramsView={paramsResult.view}
          />,
      }),
      [props, urlResult.view, paramsResult.view]
    );

    return { view, outputP };
  })
);

const View = memo(function View(props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  urlView: ToolView<ToolProgram>,
  paramsView: ToolView<ToolProgram>,
}) {
  const { program, updateProgram, autoFocus, urlView, paramsView } = props;
  const programUP = useUpdateProxy(updateProgram);

  const leftCommonWidth = useCommonWidth();

  const [isCol, setIsCol] = useState(false);
  const headingAlignment = isCol ? 'left' : 'right';

  return <div className="xCol xGap10 xPad10 xWidthFitContent">
    <RowToCol minRowWidth={200} className="xGap10" autoFocus={true} reportIsCol={setIsCol}>
      {leftCommonWidth.wrap(<b>url</b>, headingAlignment)}
      <ShowView view={urlView} updateProgram={programUP.urlProgram.$apply} autoFocus={autoFocus} />
    </RowToCol>
    <RowToCol minRowWidth={200} className="xGap10">
      {leftCommonWidth.wrap(<b>params</b>, headingAlignment)}
      <ShowView view={paramsView} updateProgram={programUP.paramsProgram.$apply} />
    </RowToCol>
    <RowToCol minRowWidth={200} className="xGap10">
      {!isCol && leftCommonWidth.wrap(null, headingAlignment)}
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
    </RowToCol>
  </div>;
});
