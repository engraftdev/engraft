import { WidgetType } from "@codemirror/view";
import PortalSet from "./PortalSet";

// a CodeMirror widget which reports to a PortalSet for React rendering

export default class PortalWidget<T> extends WidgetType {
  elem?: HTMLSpanElement;

  constructor(readonly portalSet: PortalSet<T>, readonly data: T) {
    super()
  }

  eq() {
    return true;
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