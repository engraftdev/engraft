import { forgetP, Tool, toolFromModule } from "@engraft/core";
import * as Color from "./color";
import * as Extractor from "./extractor";
import * as File from "./file";
import * as Formatter from "./formatter";
import * as Function from "./function";
import * as HelloWorld from "./hello-world";
import * as Import from "./import";
import * as Map from "./map";
import * as NotFound from "./not-found";
import * as Notebook from "./notebook";
import * as Request from "./request";
import * as SimpleChart from "./simple-chart";
import * as Simulation from "./simulation";
import * as Slider from "./slider";
import * as Slot from "./slot";
import * as Synthesizer from "./synthesizer";
import * as TestArray from "./test-array";
import * as TestDelay from "./test-delay";
import * as TestKnownOutput from "./test-known-output";
import * as TestSeeingDouble from "./test-seeing-double";
import * as TestShowProgram from "./test-show-program";
import * as TestTextLatency from "./test-text-latency";

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
