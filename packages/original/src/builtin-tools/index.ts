import { forgetP, Tool, toolFromModule } from "@engraft/core";
import ToyAdder from '@engraft/tool-toy-adder';
import Checkbox from '@engraft/tool-checkbox';
import Hider from '@engraft/tool-hider';
import { GadgetDefiner, GadgetUser } from '@engraft/tool-gadget';

const modules = import.meta.glob('./*/index.tsx', { eager: true });
export const builtinTools: Tool[] = [
  ...Object.values(modules).map((module) =>
    toolFromModule(module as any)
  ),
  forgetP(toolFromModule(ToyAdder)),
  forgetP(toolFromModule(Checkbox)),
  forgetP(toolFromModule(Hider)),
  forgetP(toolFromModule(GadgetDefiner)),
  forgetP(toolFromModule(GadgetUser)),
]
