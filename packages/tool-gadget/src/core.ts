import { EngraftPromise, hookRunToolWithNewScopeVarBindings, ToolOutput, ToolProgram, Var, VarBindings } from "@engraft/core";
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
  const programVarBindings = hookMemo(() => ({
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
  const outputResults = hookRunToolWithNewScopeVarBindings(
    {program: def.outputProgram, varBindings},
    programVarBindings
  );

  return outputResults;
});

export const runViewProgram = hooks((
  def: GadgetDef,
  closureVarBindings: VarBindings,
  gadgetProgram: unknown,
  gadgetProgramUP: UpdateProxy<unknown>,
) => {
  const programVarBindings = hookMemo(() => ({
    [def.programVar.id]: {
      var_: def.programVar,
      outputP: gadgetProgram ?
        EngraftPromise.resolve({value: gadgetProgram}) :
        EngraftPromise.unresolved<ToolOutput>()
    }
  }), [gadgetProgram, def.programVar]);
  const programUPVarBindings = hookMemo(() => ({
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
  const viewResults = hookRunToolWithNewScopeVarBindings(
    {program: def.viewProgram, varBindings},
    hookMemo(() => ({...programVarBindings, ...programUPVarBindings}), [programVarBindings, programUPVarBindings])
  );

  return viewResults;
});
