import { memo } from "react";
import { EngraftStream } from "src/engraft/EngraftStream";
import { useStream } from "src/engraft/EngraftStream.react";
import { ToolViewRenderProps, ToolView } from ".";

export interface ShowViewProps extends ToolViewRenderProps {
  view: ToolView | undefined;
}

export const ShowView = memo(function ShowView({view, ...rest}: ShowViewProps) {
  if (!view) {
    return null;
  }

  return view.render(rest);
});


export interface ShowViewStreamProps extends ToolViewRenderProps {
  viewS: EngraftStream<ToolView>;
}

export const ShowViewStream = memo(function ShowViewStream({viewS, ...rest}: ShowViewStreamProps) {
  const view = useStream(viewS);

  return <ShowView view={view} {...rest} />;
});
