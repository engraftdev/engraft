import { memo, useEffect } from "react";
import { useIncr } from "src/incr/react";
import { Setter } from "src/util/immutable";
import IsolateStyles from "src/view/IsolateStyles";
import { ToolOutput, ToolProps, ToolViewRenderProps } from ".";
import { PromiseState } from "./EngraftPromise";
import { usePromiseState } from "./EngraftPromise.react";
import { runTool } from "./hooks";
import { ShowView } from "./ShowView";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & { reportOutputState: Setter<PromiseState<ToolOutput>> } & ToolViewRenderProps;

export const ToolWithView = memo(function ToolWithView({ program, updateProgram, varBindings, reportOutputState, ...rest }: ToolWithViewProps) {
  const {outputP, view} = useIncr(runTool, { program, varBindings, updateProgram });

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
