import { Dispatcher, EngraftContext, Tool, forgetP, toolFromModule } from "@engraft/core";
import { originalTools } from "@engraft/original-tools";
import Checkbox from "@engraft/tool-checkbox";
import DataTable from "@engraft/tool-data-table";
import ExampleDatasets from "@engraft/tool-example-datasets";
import Extractor from "@engraft/tool-extractor";
import Function from "@engraft/tool-function";
import { GadgetDefiner, GadgetUser } from "@engraft/tool-gadget";
import Hider from "@engraft/tool-hider";
import Map from "@engraft/tool-map";
import Markdown from "@engraft/tool-markdown";
import Notebook from "@engraft/tool-notebook";
import NotebookCanvas from "@engraft/tool-notebook-canvas";
import Python from "@engraft/tool-python";
import Slot, { makeSlotWithCode, makeSlotWithProgram } from "@engraft/tool-slot";
import TestCountRuns from "@engraft/tool-test-count-runs";
import Text from "@engraft/tool-text";
import ToyAdder from "@engraft/tool-toy-adder";
import ToyAdderSimple from "@engraft/tool-toy-adder-simple";
import ToyAdderVanilla from "@engraft/tool-toy-adder-vanilla";
import ToyHelloWorld from "@engraft/tool-toy-hello-world";
import ToyHelloWorldVanilla from "@engraft/tool-toy-hello-world-vanilla";
import Value from "@engraft/tool-value";
import Voyager from "@engraft/tool-voyager";

const tools: Tool[] = [
  forgetP(toolFromModule(Checkbox)),
  forgetP(toolFromModule(DataTable)),
  forgetP(toolFromModule(ExampleDatasets)),
  forgetP(toolFromModule(Extractor)),
  forgetP(toolFromModule(Function)),
  forgetP(toolFromModule(GadgetDefiner)),
  forgetP(toolFromModule(GadgetUser)),
  forgetP(toolFromModule(Hider)),
  forgetP(toolFromModule(Map)),
  forgetP(toolFromModule(Markdown)),
  forgetP(toolFromModule(Notebook)),
  forgetP(toolFromModule(NotebookCanvas)),
  forgetP(toolFromModule(Python)),
  forgetP(toolFromModule(Slot)),
  forgetP(toolFromModule(TestCountRuns)),
  forgetP(toolFromModule(Text)),
  forgetP(toolFromModule(ToyAdder)),
  forgetP(toolFromModule(ToyAdderSimple)),
  forgetP(toolFromModule(ToyAdderVanilla)),
  forgetP(toolFromModule(ToyHelloWorld)),
  forgetP(toolFromModule(ToyHelloWorldVanilla)),
  forgetP(toolFromModule(Value)),
  forgetP(toolFromModule(Voyager)),
  ...originalTools,
];

export function makeBasicContext() {
  const context: EngraftContext = {
    dispatcher: new Dispatcher(),
    makeSlotWithCode,
    makeSlotWithProgram,
    debugMode: false,
  };

  for (const tool of tools) {
    context.dispatcher.registerTool(tool);
  }

  return context
}
