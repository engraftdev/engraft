import { memo, useEffect } from "react";
import { Setter } from "../util/immutable.js";
import IsolateStyles from "../view/IsolateStyles.js";
import { useRefunction } from "@engraft/refunc-react";
import { EngraftPromise, PromiseState, runTool, ShowView, ToolOutput, ToolProps, ToolViewContext, ToolViewRenderProps, usePromiseState } from "@engraft/core";

/*
  ToolWithView is a quick and simple way to embed a tool somewhere outside
  Engraft.

  (It's used /inside/ a few Engraft tools right now, but that's hacky and should
  probably change since references aren't handled correctly.
*/

// TODO: move this to "hostkit"

type ToolWithViewProps =
  ToolProps<any>
  & ToolViewRenderProps<any>
  & {
    reportOutputP?: Setter<EngraftPromise<ToolOutput>>
    reportOutputState?: Setter<PromiseState<ToolOutput>>
  };

export const ToolWithView = memo(function ToolWithView(props: ToolWithViewProps) {
  const { program, varBindings, reportOutputState, reportOutputP, ...rest } = props;

  const {outputP, view} = useRefunction(runTool, { program, varBindings });
  useEffect(() => {
    reportOutputP && reportOutputP(outputP);
  }, [outputP, reportOutputP]);

  const outputState = usePromiseState(outputP);
  useEffect(() => {
    reportOutputState && reportOutputState(outputState);
  }, [outputState, reportOutputState]);

  return <>
    <IsolateStyles>
      <ToolViewContext.Provider value={{scopeVarBindings: varBindings}}>
        <ShowView view={view} {...rest} />
      </ToolViewContext.Provider>
    </IsolateStyles>
  </>
});
