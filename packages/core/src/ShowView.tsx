import { memo } from "react";
import { ToolViewRenderProps, ToolView, ToolProgram } from "./core.js";

export type ShowViewProps<P extends ToolProgram> = ToolViewRenderProps<P> & {
  view: ToolView<P>,
}

const ShowViewNoMemo = function ShowView<P extends ToolProgram>({view, ...rest}: ShowViewProps<P>) {
  return view.render(rest);
};

export const ShowView = memo(ShowViewNoMemo) as typeof ShowViewNoMemo;
