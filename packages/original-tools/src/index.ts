import { forgetP, Tool, toolFromModule } from "@engraft/toolkit";
import * as Color from "./color/index.js";
import * as Extractor from "./extractor/index.js";
import * as File from "./file/index.js";
import * as Formatter from "./formatter/index.js";
import * as NPM from "./npm/index.js";
import * as NotFound from "./not-found/index.js";
import * as Request from "./request/index.js";
import * as SimpleChart from "./simple-chart/index.js";
import * as Simulation from "./simulation/index.js";
import * as Slider from "./slider/index.js";
import * as Synthesizer from "./synthesizer/index.js";
import * as TestArray from "./test-array/index.js";
import * as TestDelay from "./test-delay/index.js";
import * as TestSeeingDouble from "./test-seeing-double/index.js";
import * as TestShowProgram from "./test-show-program/index.js";
import * as TestTextLatency from "./test-text-latency/index.js";

export const originalTools: Tool[] = [
  forgetP(toolFromModule(Color)),
  forgetP(toolFromModule(Extractor)),
  forgetP(toolFromModule(File)),
  forgetP(toolFromModule(Formatter)),
  forgetP(toolFromModule(NPM)),
  forgetP(toolFromModule(NotFound)),
  forgetP(toolFromModule(Request)),
  forgetP(toolFromModule(SimpleChart)),
  forgetP(toolFromModule(Simulation)),
  forgetP(toolFromModule(Slider)),
  forgetP(toolFromModule(Synthesizer)),
  forgetP(toolFromModule(TestArray)),
  forgetP(toolFromModule(TestDelay)),
  forgetP(toolFromModule(TestSeeingDouble)),
  forgetP(toolFromModule(TestShowProgram)),
  forgetP(toolFromModule(TestTextLatency)),
];
