import { Dispatcher, EngraftContext, Tool, forgetP } from "@engraft/toolkit";
import * as TestingKnownOutput from "./testing-known-output.js";
import * as TestingRefsFunc from "./testing-refs-func.js";

export * as TestingKnownOutput from "./testing-known-output.js";
export * as TestingRefsFunc from "./testing-refs-func.js";

// TODO: rename this package; parallel to basic-setup

const tools: Tool[] = [
  forgetP(TestingKnownOutput.tool),
  forgetP(TestingRefsFunc.tool),
]

export function makeTestingContext() {
  const context: EngraftContext = {
    dispatcher: new Dispatcher(),
    makeSlotWithCode: () => {
      throw new Error("Testing context does not support makeSlotWithCode");
    },
    makeSlotWithProgram: () => {
      throw new Error("Testing context does not support makeSlotWithProgram");
    },
    debugMode: false,
  };

  for (const tool of tools) {
    context.dispatcher.registerTool(tool);
  }

  return context
}
