import { CSSProperties } from "react";

export * from "@engraft/core";
export * from "@engraft/core-widgets";
export * from "@engraft/refunc-react";
export * from "@engraft/update-proxy-react";
export * as SetOps from "@engraft/shared/lib/sets.js";
export * from "./simple-tool.js";
export * from "./CommonWidth.js";
export * from "./input.js";
export * from "./cellNetwork.js";

export const outputBackgroundColor = "hsl(120, 50%, 97%)";

export const outputBackgroundStyle: CSSProperties = {
  backgroundColor: outputBackgroundColor,
  ...{ "--shadow-color": outputBackgroundColor },
}
