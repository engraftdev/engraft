import { forgetP, Tool, toolFromModule } from "@engraft/core";
import * as Color from "./color/index.js";
import * as Extractor from "./extractor/index.js";
import * as File from "./file/index.js";
import * as Formatter from "./formatter/index.js";
import * as Function from "./function/index.js";
import * as HelloWorld from "./hello-world/index.js";
import * as Import from "./import/index.js";
import * as Map from "./map/index.js";
import * as NotFound from "./not-found/index.js";
import * as Notebook from "./notebook/index.js";
import * as Request from "./request/index.js";
import * as SimpleChart from "./simple-chart/index.js";
import * as Simulation from "./simulation/index.js";
import * as Slider from "./slider/index.js";
import * as Slot from "./slot/index.js";
import * as Synthesizer from "./synthesizer/index.js";
import * as TestArray from "./test-array/index.js";
import * as TestDelay from "./test-delay/index.js";
import * as TestKnownOutput from "./test-known-output/index.js";
import * as TestSeeingDouble from "./test-seeing-double/index.js";
import * as TestShowProgram from "./test-show-program/index.js";
import * as TestTextLatency from "./test-text-latency/index.js";

export const builtinTools: Tool[] = [
  forgetP(toolFromModule(Color)),
  forgetP(toolFromModule(Extractor)),
  forgetP(toolFromModule(File)),
  forgetP(toolFromModule(Formatter)),
  forgetP(toolFromModule(Function)),
  forgetP(toolFromModule(HelloWorld)),
  forgetP(toolFromModule(Import)),
  forgetP(toolFromModule(Map)),
  forgetP(toolFromModule(NotFound)),
  forgetP(toolFromModule(Notebook)),
  forgetP(toolFromModule(Request)),
  forgetP(toolFromModule(SimpleChart)),
  forgetP(toolFromModule(Simulation)),
  forgetP(toolFromModule(Slider)),
  forgetP(toolFromModule(Slot)),
  forgetP(toolFromModule(Synthesizer)),
  forgetP(toolFromModule(TestArray)),
  forgetP(toolFromModule(TestDelay)),
  forgetP(toolFromModule(TestKnownOutput)),
  forgetP(toolFromModule(TestSeeingDouble)),
  forgetP(toolFromModule(TestShowProgram)),
  forgetP(toolFromModule(TestTextLatency)),
];
