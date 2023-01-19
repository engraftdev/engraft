import { memo, useEffect } from "react";
import { useMento } from "src/mento/react";
import { Setter } from "src/util/immutable";
import IsolateStyles from "src/view/IsolateStyles";
import { ToolOutput, ToolProps, ToolViewRenderProps } from ".";
import { PromiseState } from "./EngraftPromise";
import { usePromiseState } from "./EngraftPromise.react";
import { runTool } from "./hooks";
import { ShowViewStream } from "./ShowView";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & { reportOutputState: Setter<PromiseState<ToolOutput>> } & ToolViewRenderProps;

export const ToolWithView = memo(function ToolWithView({ program, updateProgram, varBindings, reportOutputState, ...rest }: ToolWithViewProps) {
  const {outputP, viewS} = useMento(runTool, { program, varBindings, updateProgram });

  const outputState = usePromiseState(outputP);
  useEffect(() => {
    reportOutputState(outputState);
  }, [outputState, reportOutputState]);

  return <>
    <IsolateStyles>
      <ShowViewStream viewS={viewS} {...rest} />
    </IsolateStyles>
  </>
});
