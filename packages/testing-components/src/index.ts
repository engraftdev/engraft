import { registerTool, setSlotWithCode, setSlotWithProgram, slotWithCode, slotWithProgram } from "@engraft/toolkit";

import * as TestingKnownOutput from "./testing-known-output.js";
import * as TestingRefsFunc from "./testing-refs-func.js";

export * as TestingKnownOutput from "./testing-known-output.js";
export * as TestingRefsFunc from "./testing-refs-func.js";

export function registerTestingComponents() {
  registerTool(TestingKnownOutput.tool);
  registerTool(TestingRefsFunc.tool);

  // TODO: questionable moves for test environment...
  try { slotWithCode(); }
  catch { setSlotWithCode(() => undefined as any); }
  try { slotWithProgram(undefined as any); }
  catch { setSlotWithProgram(() => undefined as any); }
}
