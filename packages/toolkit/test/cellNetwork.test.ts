import { EngraftPromise, ToolResultWithScope } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc-react";
import { empty } from "@engraft/shared/lib/noOp.js";
import { TestingKnownOutput, TestingRefsFunc, registerTestingComponents } from "@engraft/testing-components";
import { updateWithUP } from "@engraft/update-proxy-react";
import { describe, expect, test } from "vitest";
import { CellNetworkProps, cellNetwork } from "../lib/cellNetwork.js";

registerTestingComponents();

function expectCellNetworkValues(
  networkResult: Record<string, ToolResultWithScope>,
  values: Record<string, unknown>,
) {
  for (const [varId, value] of Object.entries(values)) {
    expect(EngraftPromise.state(networkResult[varId].result.outputP)).toEqual({status: 'fulfilled', value: {value}});
  }
}

describe('cellNetwork', () => {
  test('results are referentially stable', () => {
    const varA = {id: 'A', label: ''};
    const varB = {id: 'B', label: ''};

    let props: CellNetworkProps = {
      cells: [
        {
          var_: varA,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for A'}),
          } satisfies TestingKnownOutput.Program,
        },
        {
          var_: varB,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for B'}),
          } satisfies TestingKnownOutput.Program,
        },
      ],
      varBindings: empty,
    };

    const mem = new RefuncMemory();
    const result1 = cellNetwork(mem, props);
    expectCellNetworkValues(result1, { A: 'value for A', B: 'value for B' });

    props = updateWithUP(props, (up) => up.cells[0].program.outputP.$set(EngraftPromise.resolve({value: 'new value for A'})));
    const result2 = cellNetwork(mem, props);
    expectCellNetworkValues(result2, { A: 'new value for A', B: 'value for B' });
    expect(result2.B.result).toBe(result1.B.result);
  });

  test('varBindings is referentially stable (direct ref)', () => {
    const varA = {id: 'A', label: ''};
    const varB = {id: 'B', label: ''};
    const varC = {id: 'C', label: ''};

    let varBindingsForB: any = undefined;
    let props: CellNetworkProps = {
      cells: [
        {
          var_: varA,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for A'}),
          } satisfies TestingKnownOutput.Program,
        },
        {
          var_: varB,
          program: {
            toolName: 'testing-refs-func',
            refs: [ varA.id ],
            func: ([value]) => value,
            onRun: ({ varBindings }) => varBindingsForB = varBindings,
          } satisfies TestingRefsFunc.Program,
        },
        {
          var_: varC,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for C'}),
          } satisfies TestingKnownOutput.Program,
        },
      ],
      varBindings: empty,
    };

    const mem = new RefuncMemory();
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'value for C' })
    const varBindingsForB1 = varBindingsForB;
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'value for C' })
    const varBindingsForB2 = varBindingsForB;
    expect(varBindingsForB2).toBe(varBindingsForB1);

    props = updateWithUP(props, (propsUP) => {
      propsUP.cells[2].program.$as<TestingKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({value: 'new value for C'}));
    })
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'new value for C' })
    const varBindingsForB3 = varBindingsForB;
    expect(varBindingsForB3).toBe(varBindingsForB2);
  });

  test('varBindings is referentially stable (prev)', () => {
    const varA = {id: 'A', label: ''};
    const varB = {id: 'B', label: ''};
    const varC = {id: 'C', label: ''};

    const prevVarId = "IDprev000000";

    let varBindingsForB: any = undefined;
    let props: CellNetworkProps = {
      cells: [
        {
          var_: varA,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for A'}),
          } satisfies TestingKnownOutput.Program,
        },
        {
          var_: varB,
          program: {
            toolName: 'testing-refs-func',
            refs: [ prevVarId ],
            func: ([value]) => value,
            onRun: ({ varBindings }) => varBindingsForB = varBindings,
          } satisfies TestingRefsFunc.Program,
        },
        {
          var_: varC,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({value: 'value for C'}),
          } satisfies TestingKnownOutput.Program,
        },
      ],
      varBindings: empty,
      prevVarId,
    };

    const mem = new RefuncMemory();
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'value for C' })
    const varBindingsForB1 = varBindingsForB;
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'value for C' })
    const varBindingsForB2 = varBindingsForB;
    expect(varBindingsForB2).toBe(varBindingsForB1);

    props = updateWithUP(props, (propsUP) => {
      propsUP.cells[2].program.$as<TestingKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({value: 'new value for C'}));
    })
    expectCellNetworkValues(cellNetwork(mem, props), { A: 'value for A', B: 'value for A', C: 'new value for C' })
    const varBindingsForB3 = varBindingsForB;
    expect(varBindingsForB3).toBe(varBindingsForB2);
  });
});
