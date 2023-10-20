import { CollectReferences, defineTool, EngraftPromise, hookRunTool, MakeProgram, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewRenderProps } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { useCommonWidth } from "@engraft/toolkit";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import * as d3dsv from "d3-dsv";
import { memo, useState } from "react";
import { RowToCol } from "./RowToCol.js";


type Program = {
  toolName: "request",
  urlProgram: ToolProgram,
  paramsProgram: ToolProgram,
  pauseRequest: boolean,
  forceText: boolean,
  useCorsProxy: boolean,
};

const makeProgram: MakeProgram<Program> = () => {
  return {
    toolName: "request",
    urlProgram: slotWithCode('"https://httpbin.org/get"'),
    paramsProgram: slotWithCode(paramsDefault),
    pauseRequest: false,
    forceText: false,
    useCorsProxy: false,
  };
};
const paramsDefault = `{
  my_param: "hello world!"
}`;

const collectReferences: CollectReferences<Program> = (program) =>
  [ program.urlProgram, program.paramsProgram ];

const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;

  const urlResult = hookRunTool({program: program.urlProgram, varBindings});
  const paramsResult = hookRunTool({program: program.paramsProgram, varBindings});

  const outputP = hookMemo(() => (
    EngraftPromise.all([urlResult.outputP, paramsResult.outputP]).then(async ([urlOutput, paramsOutput]) => {
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
      let url = urlObj.toString();
      if (program.useCorsProxy) {
        url = "https://corsproxy.io/?" + encodeURIComponent(url);
      }
      const resp = await fetch(url);
      const contentType = resp.headers.get("content-type");
      // TODO: handle other content types, merge with file-tool's mime-type handling, etc
      if (!program.forceText) {
        if (contentType === "text/csv") {
          return { value: d3dsv.csvParse(await resp.text(), d3dsv.autoType) }
        }
        try {
          return { value: await resp.json() };
        } catch (e) {
          // that's fine
        }
      }
      return { value: await resp.text() };

      // // Alternative, stricter treatment
      // } else if (contentType?.startsWith("text/")) {
      //   return { value: await resp.text() };
      // } else {
      //   const blob = await resp.blob();
      //   return new EngraftPromise<ToolOutput>((resolve, reject) => {
      //     const reader = new FileReader();
      //     reader.addEventListener("load", () => {
      //       if (typeof reader.result === "string") {
      //         resolve({ value: reader.result });
      //       } else {
      //         reject(new Error("Unexpected result type"));
      //       }
      //     });
      //     reader.readAsDataURL(blob);
      //   });
      // }
    })
  ), [urlResult.outputP, paramsResult.outputP, program.pauseRequest, program.useCorsProxy, program.forceText]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) =>
        <View
          {...props}
          {...renderProps}
          urlView={urlResult.view}
          paramsView={paramsResult.view}
        />,
  }), [props, urlResult.view, paramsResult.view]);

  return { view, outputP };
}));

export default defineTool({ name: "request", makeProgram, collectReferences, run });

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
      <div className="xCol xGap10">
        <label>
          <input
            type="checkbox"
            checked={program.pauseRequest}
            onChange={(ev) => programUP.pauseRequest.$set(ev.target.checked)}
          ></input>
          <span style={{marginLeft: 5}}>
            Pause request
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={program.forceText}
            onChange={(ev) => programUP.forceText.$set(ev.target.checked)}
          ></input>
          <span style={{marginLeft: 5}}>
            Output as text
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={program.useCorsProxy}
            onChange={(ev) => programUP.useCorsProxy.$set(ev.target.checked)}
          ></input>
          <span style={{marginLeft: 5}}>
            Use CORS proxy
          </span>
        </label>
      </div>
    </RowToCol>
  </div>;
});
