import { EngraftPromise, dispatcher, newVar, randomId, runTool, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { describe, expect, it } from "vitest";
import * as Map from "../lib/index.js";
import { TestingKnownOutput, TestingRefsFunc, registerTestingComponents } from "@engraft/testing-components";

registerTestingComponents();
dispatcher().registerTool(toolFromModule(Map));

describe('checkbox', () => {
  it('basically works for arrays', () => {
    const itemVar = newVar('item');
    const itemKeyVarId = randomId();
    const program = {
      toolName: 'map',
      inputProgram: {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.resolve({value: ["apple", "banana", "cherry"]}),
      } satisfies TestingKnownOutput.Program,
      itemVar,
      itemKeyVarId,
      perItemProgram: {
        toolName: 'testing-refs-func',
        refs: [itemVar.id, itemKeyVarId],
        func: ([item, itemKey]) => EngraftPromise.resolve({value: [item.value, itemKey.value]}),
      } satisfies TestingRefsFunc.Program,
    } satisfies Map.Program;

    const {outputP} = runTool(new RefuncMemory(), { program, varBindings: {} });
    expect(EngraftPromise.state(outputP)).toEqual(
      {status: 'fulfilled', value: {value: [["apple", 0], ["banana", 1], ["cherry", 2]]}}
    );
  });

  it('basically works for objects', () => {
    const itemVar = newVar('item');
    const itemKeyVarId = randomId();
    const program = {
      toolName: 'map',
      inputProgram: {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.resolve({value: {apple: 'green', banana: 'yellow', cherry: 'red'}}),
      } satisfies TestingKnownOutput.Program,
      itemVar,
      itemKeyVarId,
      perItemProgram: {
        toolName: 'testing-refs-func',
        refs: [itemVar.id, itemKeyVarId],
        func: ([item, itemKey]) => EngraftPromise.resolve({value: [item.value, itemKey.value]}),
      } satisfies TestingRefsFunc.Program,
    } satisfies Map.Program;

    const {outputP} = runTool(new RefuncMemory(), { program, varBindings: {} });
    expect(EngraftPromise.state(outputP)).toEqual(
      {status: 'fulfilled', value: {value: [["green", "apple"], ["yellow", "banana"], ["red", "cherry"]]}}
    );
  })
});
