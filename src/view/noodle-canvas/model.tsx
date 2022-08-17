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
  heading?: ReactNode,
  children?: ReactNode,
}

export function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
