import { useMemo, useState } from "react";

// a generic tool for maintaining sets of React portals coming out of an imperative system
// (like CodeMirror!)

export default class PortalSet<T> {
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

// TODO: line between class & hook are extremely blurry