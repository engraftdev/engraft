import { EngraftPromise, PromiseState, ToolOutput, ToolProps, ToolViewRenderProps, runToolWithNewVarBindings } from "@engraft/core";
import { IsolateStyles } from "@engraft/core-widgets";
import { ShowViewWithScope, usePromiseState } from "@engraft/react";
import { useRefunction } from "@engraft/refunc-react";
import { Setter } from "@engraft/shared/lib/Updater.js";
import { memo, useEffect } from "react";

/*
  ToolWithView is a quick and simple way to embed a tool somewhere outside
  Engraft.

  (It's used /inside/ a few Engraft tools right now, but that's hacky and should
  probably change since references aren't handled correctly.
*/

type ToolWithViewProps =
  ToolProps<any>
  & Omit<ToolViewRenderProps<any>, 'scopeVarBindings'>
  & {
    reportOutputP?: Setter<EngraftPromise<ToolOutput>>
    reportOutputState?: Setter<PromiseState<ToolOutput>>
  };

export const ToolWithView = memo(function ToolWithView(props: ToolWithViewProps) {
  const { program, varBindings, context, reportOutputState, reportOutputP, ...rest } = props;

  const resultWithScope = useRefunction(runToolWithNewVarBindings, { program, newVarBindings: varBindings, context })

  useEffect(() => {
    reportOutputP && reportOutputP(resultWithScope.result.outputP);
  }, [reportOutputP, resultWithScope.result.outputP]);

  const outputState = usePromiseState(resultWithScope.result.outputP);
  useEffect(() => {
    reportOutputState && reportOutputState(outputState);
  }, [outputState, reportOutputState]);

  return <>
    <IsolateStyles>
      <ShowViewWithScope resultWithScope={resultWithScope} {...rest} />
    </IsolateStyles>
  </>
});
