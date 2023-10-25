import { EngraftContext, EngraftPromise, ToolOutput, ToolProgram, ToolResultWithScope, Var, VarBindings, hookRunTool } from "@engraft/core";
import { UpdateProxy, hookMemo, hooks } from "@engraft/toolkit";

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
  const programVarBindings: VarBindings = hookMemo(() => ({
    [def.programVar.id]: {
      var_: def.programVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgram}) :
        EngraftPromise.unresolved<ToolOutput>()
    }
  }), [gadgetProgram, def.programVar]);

  const varBindings: VarBindings = hookMemo(() => ({
    ...closureVarBindings,
    ...programVarBindings,
  }), [closureVarBindings, programVarBindings]);
  const result = hookRunTool({ program: def.outputProgram, varBindings, context });
  const newScopeVarBindings = programVarBindings;
  return { result, newScopeVarBindings };
});

export const runViewProgram = hooks((
  def: GadgetDef,
  closureVarBindings: VarBindings,
  gadgetProgram: unknown,
  gadgetProgramUP: UpdateProxy<unknown>,
  context: EngraftContext,
): ToolResultWithScope => {
  const programVarBindings: VarBindings = hookMemo(() => ({
    [def.programVar.id]: {
      var_: def.programVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgram}) :
        EngraftPromise.unresolved<ToolOutput>()
    }
  }), [gadgetProgram, def.programVar]);
  const programUPVarBindings: VarBindings = hookMemo(() => ({
    [def.programUPVar.id]: {
      var_: def.programUPVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgramUP}) :
        EngraftPromise.unresolved<ToolOutput>()
    }
  }), [gadgetProgram, gadgetProgramUP, def.programUPVar]);

  const varBindings: VarBindings = hookMemo(() => ({
    ...closureVarBindings,
    ...programVarBindings,
    ...programUPVarBindings,
  }), [closureVarBindings, programVarBindings, programUPVarBindings]);
  const result = hookRunTool({ program: def.viewProgram, varBindings, context });
  const newScopeVarBindings = hookMemo(() => ({...programVarBindings, ...programUPVarBindings}), [programVarBindings, programUPVarBindings])

  return { result, newScopeVarBindings };
});
