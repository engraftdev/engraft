import { Refunction, memoize } from "@engraft/refunc";
import { useRefunction } from "../lib/index.js";
import React, { Fragment } from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it } from "vitest";

describe('useRefunction', () => {
  it('basically works', () => {
    let squareRuns = 0;
    const squareRefunc = memoize(Refunction.fromFunction((x: number) => {
      squareRuns++;
      return x * x;
    }));

    let output: number | null = null;
    const MyComponent = (props: {x: number}) => {
      output = useRefunction(squareRefunc, props.x);
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
