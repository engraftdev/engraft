import { memo } from "react";
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
