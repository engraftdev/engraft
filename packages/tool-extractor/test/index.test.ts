import { EngraftPromise, runTool, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { TestingKnownOutput, makeTestingContext } from "@engraft/testing-setup";
import { describe, expect, it } from "vitest";
import * as Extractor from "../lib/index.js";
import { Pattern } from "../lib/patterns.js";

const context = makeTestingContext();
context.dispatcher.registerTool(toolFromModule(Extractor));

describe('extractor', () => {
  const inputValue = {
    top: [
      {x: 1, y: 10, z: {a: 100}},
      {x: 2, y: 20, z: {a: 200}},
      {x: 3, y: 30, z: {a: 300}},
    ]
  };

  function testPatterns(patterns: Pattern[], expected: any) {
    const program = {
      toolName: 'extractor',
      inputProgram: {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.resolve({ value: inputValue }),
      } satisfies TestingKnownOutput.Program,
      patternsWithIds: patterns.map((pattern, i) => ({ id: `pattern_${i}`, pattern })),
      minimized: false
    } satisfies Extractor.Program;

    const { outputP } = runTool(new RefuncMemory(), { program, varBindings: {}, context });
    expect(EngraftPromise.state(outputP)).toEqual(
      { status: 'fulfilled', value: { value: expected } }
    );
  }

  it('works on single pattern without wildcards', () => {
    testPatterns(
      [
        ['top', '0', 'x'],
      ],
      1
    )
  });

  it('works on two patterns without wildcards', () => {
    testPatterns(
      [
        ['top', '0', 'x'],
        ['top', '1', 'y'],
      ],
      { '0_x': 1, '1_y': 20 }
    )
  });

  it('works on one pattern with wildcard', () => {
    testPatterns(
      [
        ['top', {wildcard: true}, 'x'],
      ],
      [ 1, 2, 3 ]
    )
  });

  it('works on two patterns with wildcards', () => {
    testPatterns(
      [
        ['top', {wildcard: true}, 'x'],
        ['top', {wildcard: true}, 'z', 'a'],
      ],
      [ { x: 1, z_a: 100 }, { x: 2, z_a: 200 }, { x: 3, z_a: 300 } ]
    )
  });
});
