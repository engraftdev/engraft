export type Pane = {
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

export function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
