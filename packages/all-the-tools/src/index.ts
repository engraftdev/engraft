import { forgetP, registerTool, Tool, toolFromModule } from "@engraft/core";
import { builtinTools } from "@engraft/original/lib/builtin-tools/index.js";
import ToyAdder from "@engraft/tool-toy-adder";
import ToyAdderSimple from "@engraft/tool-toy-adder-simple";
import Checkbox from "@engraft/tool-checkbox";
import Hider from "@engraft/tool-hider";
import { GadgetDefiner, GadgetUser } from "@engraft/tool-gadget";
import DataTable from "@engraft/tool-data-table";

// This package is named somewhat flippantly. We don't yet have a principled way
// to manage tool dependencies. So this package just contains all the tools.
// Once we're in a world where anyone can make a tool, this package will no
// longer make sense.

export const allTheTools: Tool[] = [
  ...builtinTools,
  forgetP(toolFromModule(ToyAdder)),
  forgetP(toolFromModule(ToyAdderSimple)),
  forgetP(toolFromModule(Checkbox)),
  forgetP(toolFromModule(Hider)),
  forgetP(toolFromModule(GadgetDefiner)),
  forgetP(toolFromModule(GadgetUser)),
  forgetP(toolFromModule(DataTable)),
]

export function registerAllTheTools() {
  allTheTools.forEach(registerTool);
}
