import { WidgetType } from "@codemirror/view";
import { useMemo, useState } from "react";


// a CodeMirror widget which reports to a PortalSet for React rendering

export class PortalWidget<T> extends WidgetType {
  elem?: HTMLSpanElement;

  constructor(readonly portalSet: PortalSet<T>, readonly data: T) {
    super()
  }

  eq(otherWidget: PortalWidget<T>) {
    return this.portalSet === otherWidget.portalSet;
  }

  toDOM() {
    this.elem = document.createElement("span")
    this.portalSet.register(this.elem, this.data);
    return this.elem;
  }

  destroy() {
    this.elem && this.portalSet.unregister(this.elem);
  }
}

// a generic tool for maintaining sets of React portals coming out of an imperative system
// (like CodeMirror!)

export class PortalSet<T> {
  private portalMap: Map<HTMLSpanElement, T> = new Map();

  constructor(readonly setPortals: (portals: [HTMLSpanElement, T][]) => void) {}

  private portals(): [HTMLSpanElement, T][] {
    return Array.from(this.portalMap.entries());
  }

  register(elem: HTMLSpanElement, data: T) {
    this.portalMap.set(elem, data);
    this.setPortals(this.portals())
  }

  unregister(elem: HTMLSpanElement) {
    this.portalMap.delete(elem);
    this.setPortals(this.portals())
  }
}

export function usePortalSet<T>() {
  const [portals, setPortals] = useState<[HTMLSpanElement, T][]>([])
  const portalSet = useMemo(() => new PortalSet<T>(setPortals), []);

  return [portalSet, portals] as const;
}
