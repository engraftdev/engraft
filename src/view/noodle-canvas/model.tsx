import { ReactNode } from "react";

export type PaneGeo = {
  x: number,
  y: number,
  width: number,
  height: number,
}

export type Pane = {
  id: string,
  geo: PaneGeo,
  children: (props: {onMouseDownDragPane: (startEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => void}) => ReactNode,
  transparent?: boolean,
}

export function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
