import { EngraftPromise, registerTool, slotWithCode, toolFromModule, ToolOutput } from '@engraft/core';
import * as Slot from '@engraft/original/src/builtin-tools/slot';
import * as TestKnownOutput from '@engraft/original/src/builtin-tools/test-known-output';
import TestRenderer from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { useEngraft } from './index';

// @vitest-environment happy-dom

registerTool(toolFromModule(Slot));
registerTool(toolFromModule(TestKnownOutput));

describe('useEngraft', () => {
  // TODO: mock out localStorage to avoid the annoying warning message

  it('basically works', () => {
    const MyComponent = (props: {}) => {
      const program = { toolName: 'test-known-output', outputP: EngraftPromise.resolve({value: 10}) } satisfies TestKnownOutput.Program;
      const value = useEngraft({}, { defaultValue: 20, program, hide: true });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['10']});
  });

  it('can read an incoming var', () => {
    const MyComponent = (props: {}) => {
      const program = slotWithCode('IDx000000');
      const value = useEngraft({ x: 10 }, { defaultValue: 20, program, hide: true });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['10']});
  });

  it('uses the default value if output is pending', () => {
    const MyComponent = (props: {}) => {
      const program = { toolName: 'test-known-output', outputP: EngraftPromise.unresolved() } satisfies TestKnownOutput.Program;
      const value = useEngraft({ }, { defaultValue: 20, program, hide: true });
      return <div>{value}</div>;
    };

    const testRenderer = TestRenderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['20']});
  });

  it('eventually uses a pending value', () => {
    const outputP = EngraftPromise.unresolved<ToolOutput>();
    const MyComponent = (props: {}) => {
      const program = { toolName: 'test-known-output', outputP } satisfies TestKnownOutput.Program;
      const value = useEngraft({ }, { defaultValue: 20, program, hide: true });
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
