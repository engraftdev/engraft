import { IncrFunction, memoize } from '@engraft/incr';
import { useIncr } from '.';
import React, { Fragment } from 'react';
import TestRenderer from 'react-test-renderer';
import { describe, expect, it } from 'vitest';

describe('useIncr', () => {
  it('basically works', () => {
    let squareRuns = 0;
    const squareIncr = memoize(IncrFunction.fromFunction((x: number) => {
      squareRuns++;
      return x * x;
    }));

    let output: number | null = null;
    const MyComponent = (props: {x: number}) => {
      output = useIncr(squareIncr, props.x);
      return null;
    };

    const testRenderer = TestRenderer.create(<Fragment></Fragment>);

    testRenderer.update(<MyComponent x={2} />);
    expect(output).toBe(4);
    expect(squareRuns).toBe(1);

    testRenderer.update(<MyComponent x={3} />);
    expect(output).toBe(9);
    expect(squareRuns).toBe(2);

    testRenderer.update(<MyComponent x={3} />);
    expect(output).toBe(9);
    expect(squareRuns).toBe(2);
  });
});
