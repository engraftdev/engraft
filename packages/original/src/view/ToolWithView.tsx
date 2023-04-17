import { memo, useEffect } from "react";
import { Setter } from "../util/immutable.js";
import IsolateStyles from "../view/IsolateStyles.js";
import { useRefunction } from "@engraft/refunc-react";
import { PromiseState, runTool, ShowView, ToolOutput, ToolProps, ToolViewContext, ToolViewRenderProps, usePromiseState } from "@engraft/core";

/*
  ToolWithView is a quick and simple way to embed a tool somewhere outside
  Engraft.

  (It's used /inside/ a few Engraft tools right now, but that's hacky and should
  probably change since references aren't handled correctly.
*/

type ToolWithViewProps =
  ToolProps<any>
  & ToolViewRenderProps<any>
  & { reportOutputState: Setter<PromiseState<ToolOutput>> };

export const ToolWithView = memo(function ToolWithView(props: ToolWithViewProps) {
  const { program, varBindings, reportOutputState, ...rest } = props;

  const {outputP, view} = useRefunction(runTool, { program, varBindings });

  const outputState = usePromiseState(outputP);
  useEffect(() => {
    reportOutputState(outputState);
  }, [outputState, reportOutputState]);

  return <>
    <IsolateStyles>
      <ToolViewContext.Provider value={{scopeVarBindings: varBindings}}>
        <ShowView view={view} {...rest} />
      </ToolViewContext.Provider>
    </IsolateStyles>
  </>
});
