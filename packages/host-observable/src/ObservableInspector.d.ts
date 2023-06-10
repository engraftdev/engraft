declare module '@observablehq/inspector' {
  export class Inspector {
    constructor(elem: HTMLElement)
    fulfilled(value: any): void
  }
}
