import { EngraftPromise, hookRunTool, ToolOutput, ToolProgram, Var, VarBindings } from "@engraft/core";
import { hookMemo, hooks, UpdateProxy } from "@engraft/toolkit";

export type GadgetDef = {
  initialProgramProgram: ToolProgram,
  outputProgram: ToolProgram,
  viewProgram: ToolProgram,

  programVar: Var,
  programUPVar: Var,
}

export type GadgetClosure = {
  gadgetClosure: true,
  def: GadgetDef,
  closureVarBindings: VarBindings,
}

export const runOutputProgram = hooks((
  def: GadgetDef,
  closureVarBindings: VarBindings,
  gadgetProgram: unknown,
) => {
  const programVarBinding = hookMemo(() => ({
    var_: def.programVar,
    outputP: gadgetProgram ?
      EngraftPromise.resolve({value: gadgetProgram}) :
      EngraftPromise.unresolved<ToolOutput>()
  }), [gadgetProgram, def.programVar]);

  const outputVarBindings: VarBindings = hookMemo(() => ({
    ...closureVarBindings,
    [def.programVar.id]: programVarBinding,
  }), [closureVarBindings, def.programVar, programVarBinding]);
  const outputResults = hookRunTool({program: def.outputProgram, varBindings: outputVarBindings});

  return outputResults;
});

export const runViewProgram = hooks((
  def: GadgetDef,
  closureVarBindings: VarBindings,
  gadgetProgram: unknown,
  gadgetProgramUP: UpdateProxy<unknown>,
) => {
  const programVarBinding = hookMemo(() => ({
    var_: def.programVar,
    outputP: gadgetProgram ?
      EngraftPromise.resolve({value: gadgetProgram}) :
      EngraftPromise.unresolved<ToolOutput>()
  }), [gadgetProgram, def.programVar]);
  const programUPVarBinding = hookMemo(() => ({
    var_: def.programUPVar,
    outputP: gadgetProgram ?
      EngraftPromise.resolve({value: gadgetProgramUP}) :
      EngraftPromise.unresolved<ToolOutput>()
  }), [gadgetProgram, gadgetProgramUP, def.programUPVar]);

  const viewVarBindings: VarBindings = hookMemo(() => ({
    ...closureVarBindings,
    [def.programVar.id]: programVarBinding,
    [def.programUPVar.id]: programUPVarBinding,
  }), [closureVarBindings, def.programVar, def.programUPVar, programUPVarBinding, programVarBinding]);
  const viewResults = hookRunTool({program: def.viewProgram, varBindings: viewVarBindings});

  return viewResults;
});
