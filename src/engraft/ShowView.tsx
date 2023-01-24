import { memo } from "react";
import { ToolViewRenderProps, ToolView } from ".";

export type ShowViewProps = ToolViewRenderProps & {
  view: ToolView | undefined,
}

export const ShowView = memo(function ShowView({view, ...rest}: ShowViewProps) {
  if (!view) {
    return null;
  }

  return view.render(rest);
});
