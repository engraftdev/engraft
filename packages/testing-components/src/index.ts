import { registerTool } from "@engraft/toolkit";

import * as TestingKnownOutput from "./testing-known-output.js";
import * as TestingRefsFunc from "./testing-refs-func.js";

export * as TestingKnownOutput from "./testing-known-output.js";
export * as TestingRefsFunc from "./testing-refs-func.js";

export function registerTestingComponents() {
  registerTool(TestingKnownOutput.tool);
  registerTool(TestingRefsFunc.tool);
}
