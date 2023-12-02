import { EngraftContext, EngraftPromise, ToolOutput, ToolProgram, ToolResultWithScope, UpdateProxy, Var, VarBindings, hookMemo, hookRunToolWithNewVarBindings, hooks } from "@engraft/toolkit";

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
  context: EngraftContext,
): ToolResultWithScope => {
  const newVarBindings: VarBindings = hookMemo(() => ({
    [def.programVar.id]: {
      var_: def.programVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgram}) :
        EngraftPromise.unresolved<ToolOutput>()
    }
  }), [gadgetProgram, def.programVar]);

  return hookRunToolWithNewVarBindings({
    program: def.outputProgram, varBindings: closureVarBindings, newVarBindings, context
  });
});

export const runViewProgram = hooks((
  def: GadgetDef,
  closureVarBindings: VarBindings,
  gadgetProgram: unknown,
  gadgetProgramUP: UpdateProxy<unknown>,
  context: EngraftContext,
): ToolResultWithScope => {
  const newVarBindings: VarBindings = hookMemo(() => ({
    [def.programVar.id]: {
      var_: def.programVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgram}) :
        EngraftPromise.unresolved<ToolOutput>()
    },
    [def.programUPVar.id]: {
      var_: def.programUPVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgramUP}) :
        EngraftPromise.unresolved<ToolOutput>()
    },
  }), [def.programVar, def.programUPVar, gadgetProgram, gadgetProgramUP]);

  return hookRunToolWithNewVarBindings({
    program: def.viewProgram, varBindings: closureVarBindings, newVarBindings, context
  });
});
