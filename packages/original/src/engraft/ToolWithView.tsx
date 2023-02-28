import { memo, useEffect } from "react";
import { Setter } from "../util/immutable";
import IsolateStyles from "../view/IsolateStyles";
import { ToolOutput, ToolProps, ToolViewRenderProps } from ".";
import { PromiseState } from "./EngraftPromise";
import { usePromiseState } from "./EngraftPromise.react";
import { runTool } from "./hooks";
import { ShowView } from "./ShowView";
import { useIncr } from "@engraft/incr-react";

type ToolWithViewProps =
  ToolProps<any>
  & ToolViewRenderProps<any>
  & { reportOutputState: Setter<PromiseState<ToolOutput>> };

export const ToolWithView = memo(function ToolWithView(props: ToolWithViewProps) {
  const { program, varBindings, reportOutputState, ...rest } = props;

  const {outputP, view} = useIncr(runTool, { program, varBindings });

  const outputState = usePromiseState(outputP);
  useEffect(() => {
    reportOutputState(outputState);
  }, [outputState, reportOutputState]);

  return <>
    <IsolateStyles>
      <ShowView view={view} {...rest} />
    </IsolateStyles>
  </>
});
