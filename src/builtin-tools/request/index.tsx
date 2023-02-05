import { memo } from "react";
import { slotSetTo } from "src/builtin-tools/slot";
import { RowToCol } from "src/util/RowToCol";
import { safeToString } from "src/util/safeToString";
import { union } from "src/util/sets";
import {
  references,
  ProgramFactory,
  ComputeReferences,
  ToolProgram,
  ToolProps,
  ToolView,
  ToolViewRenderProps,
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

export const run = memoizeProps(
  hooks((props: ToolProps<Program>) => {
    const { program, updateProgram, varBindings } = props;
    const [autoSend, toggleAutosend] = hookAt(
      program,
      updateProgram,
      "autoSend"
    );

    const { view: urlViewP, outputP: urlOutputP } = hookRunSubTool({
      program,
      updateProgram,
      subKey: "urlProgram",
      varBindings,
    });

    const { view: paramsViewP, outputP: paramsOutputP } = hookRunSubTool({
      program,
      updateProgram,
      subKey: "paramsProgram",
      varBindings,
    });

    const send = async (urlOutput: any, paramsOutput: any) => {
      if (typeof urlOutput.value !== "string") {
        return;
      }
      if (
        typeof paramsOutput.value !== "object" ||
        paramsOutput.value === null
      ) {
        return;
      }
      const urlObj = new URL(urlOutput.value);
      Object.entries(paramsOutput.value).forEach(([k, v]) =>
        urlObj.searchParams.append(
          k,
          typeof v === "string" ? v : JSON.stringify(v as any)
        )
      );
      try {
        const resp = await fetch(urlObj.toString());
        const data: unknown = await resp.json();
        return data;
      } catch (e) {
        console.log("error", e);
        return { error: safeToString(e) || "unknown error" };
      }
    };

    const outputP = hookMemo(
      () =>
        EngraftPromise.all([urlOutputP, paramsOutputP]).then(
          async ([urlOutput, paramsOutput]) => {
            if (autoSend) {
              return {};
            }
            const res = await send(urlOutput, paramsOutput);
            return { value: res };
          }
        ),
      [urlOutputP, paramsOutputP, autoSend]
    );

    // Question for Josh -- should this "pause" request toggle be here, or in the view below?
    const view: ToolView = hookMemo(
      () => ({
        render: (viewProps) => (
          <>
            <View
              {...props}
              {...viewProps}
              urlView={urlViewP}
              paramsView={paramsViewP}
            />
            <div style={{ float: "left", padding: "10px" }}>
              <input
                type="checkbox"
                checked={autoSend}
                onChange={() => toggleAutosend((autoSend) => !autoSend)}
              ></input>
              Pause request
            </div>
          </>
        ),
      }),
      [urlViewP, paramsViewP, autoSend]
    );

    return { view, outputP };
  })
);

type ViewProps = ToolViewRenderProps &
  ToolProps<Program> & {
    urlView: ToolView | null;
    paramsView: ToolView | null;
    isPending: boolean;
    response: Response | null;
  };

const View = memo((props: ViewProps) => {
  const { autoFocus, urlView, paramsView, response } = props;
  return (
    <div className="xCol xGap10 xPad10 xWidthFitContent">
      <RowToCol minRowWidth={200} className="xGap10">
        <b>url</b> <ShowView view={urlView} autoFocus={autoFocus} />
      </RowToCol>
      <RowToCol minRowWidth={200} className="xGap10">
        <b>params</b> <ShowView view={paramsView} />
      </RowToCol>
      <div className="xRow xGap10">
        <div className="xExpand" />
      </div>
    </div>
  );
});
