import { dispatcher, EngraftPromise, slotWithCode, toolFromModule, ToolOutput } from "@engraft/core";
import { registerTestingComponents, TestingKnownOutput } from "@engraft/testing-components";
import Slot from "@engraft/tool-slot";
import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { useEngraft } from "../lib/index.js";

// @vitest-environment happy-dom

registerTestingComponents();
dispatcher().registerTool(toolFromModule(Slot));

describe('useEngraft', () => {
  it('basically works', () => {
    const MyComponent = (props: {}) => {
      const program = {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.resolve({value: 10}),
      } satisfies TestingKnownOutput.Program;
      const value = useEngraft({
        program: { savedProgramId: 'IDx000000', program },
        defaultValue: 20,
      });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['10']});
  });

  it('can read an incoming var', () => {
    const MyComponent = (props: {}) => {
      const program = slotWithCode('IDx000000');
      const value = useEngraft({
        program: { savedProgramId: 'IDx000000', program },
        inputs: { x: 10 },
        defaultValue: 20,
      });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['10']});
  });

  it('uses the default value if output is pending', () => {
    const MyComponent = (props: {}) => {
      const program = {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.unresolved(),
      } satisfies TestingKnownOutput.Program;
      const value = useEngraft({
        program: { savedProgramId: 'IDx000000', program },
        defaultValue: 20,
      });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['20']});
  });

  it('eventually uses a pending value', () => {
    const outputP = EngraftPromise.unresolved<ToolOutput>();
    const MyComponent = (props: {}) => {
      const program = {
        toolName: 'testing-known-output',
        outputP,
      } satisfies TestingKnownOutput.Program;
      const value = useEngraft({
        program: { savedProgramId: 'IDx000000', program },
        defaultValue: 20,
      });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['20']});
    outputP.resolve({ value: 30 });
    testRenderer.update(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['30']});
  });

  it.todo('works with changing input values');
});
