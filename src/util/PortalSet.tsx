import { ReactNode } from "react";
import ReactDOM from "react-dom";

// a generic tool for maintaining sets of React portals coming out of an imperative system
// (like CodeMirror!)

export default class PortalSet<T> {
  portals: Map<HTMLSpanElement, T> = new Map();

  constructor(readonly onChange?: () => void) {}

  register(elem: HTMLSpanElement, data: T) {
    this.portals.set(elem, data);
    this.onChange && this.onChange();
  }

  unregister(elem: HTMLSpanElement) {
    this.portals.delete(elem);
    this.onChange && this.onChange();
  }

  render(f: (data: T) => ReactNode): ReactNode[] {
    let nodes: ReactNode[] = [];
    this.portals.forEach((data, elem) =>
      nodes.push(ReactDOM.createPortal(f(data), elem ))
    )
    return nodes;
  }
}