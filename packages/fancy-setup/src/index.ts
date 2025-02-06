import { makeBasicContext } from "@engraft/basic-setup";
import { Tool, forgetP, toolFromModule } from "@engraft/core";
import ExampleDatasets from "@engraft/tool-example-datasets";
import Geom from "@engraft/tool-geom";
import Python from "@engraft/tool-python";
import Voyager from "@engraft/tool-voyager";

const tools: Tool[] = [
  forgetP(toolFromModule(ExampleDatasets)),
  forgetP(toolFromModule(Geom)),
  forgetP(toolFromModule(Python)),
  forgetP(toolFromModule(Voyager)),
];

export function makeFancyContext() {
  const context = makeBasicContext();

  for (const tool of tools) {
    context.dispatcher.registerTool(tool);
  }

  return context
}
