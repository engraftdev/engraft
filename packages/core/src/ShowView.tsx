import { memo } from "react";
import { ToolViewRenderProps, ToolView, ToolProgram } from "./core";

export type ShowViewProps<P extends ToolProgram> = ToolViewRenderProps<P> & {
  view: ToolView<P>,
}

export const ShowViewNoMemo = function ShowView<P extends ToolProgram>({view, ...rest}: ShowViewProps<P>) {
  if (!view) {
    return null;
  }

  return view.render(rest);
};

export const ShowView = memo(ShowViewNoMemo) as typeof ShowViewNoMemo;
