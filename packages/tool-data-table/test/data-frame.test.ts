import { describe, it, expect } from 'vitest';
import { inferTypeFromValues, inferDataFrameFromRows, Column } from '../lib/data-frame.js';


describe('inferTypeFromValues', () => {
  it('basically works', () => {
    expect(inferTypeFromValues([1, 2, 3])).toEqual('integer');
    expect(inferTypeFromValues([1, 2, 3.5])).toEqual('number');
    expect(inferTypeFromValues([1, 2, '3'])).toEqual('other');
    expect(inferTypeFromValues([1, 2, null])).toEqual('integer');
    expect(inferTypeFromValues([1, 2, undefined])).toEqual('integer');
    expect(inferTypeFromValues([1, 2, new Date()])).toEqual('other');
    expect(inferTypeFromValues([1, 2, true])).toEqual('other');
    expect(inferTypeFromValues([1, 2, false])).toEqual('other');
    expect(inferTypeFromValues([1, 2, '2020-01-01'])).toEqual('other');

    expect(inferTypeFromValues(['a', 'b'])).toEqual('string');
    expect(inferTypeFromValues(['a', 'b', null])).toEqual('string');
    expect(inferTypeFromValues(['a', 'b', undefined])).toEqual('string');

    expect(inferTypeFromValues([true, false])).toEqual('boolean');
    expect(inferTypeFromValues([true, false, null])).toEqual('boolean');
    expect(inferTypeFromValues([true, false, undefined])).toEqual('boolean');

    expect(inferTypeFromValues([new Date(), new Date()])).toEqual('date');
    expect(inferTypeFromValues([new Date(), new Date(), null])).toEqual('date');
    expect(inferTypeFromValues([new Date(), new Date(), undefined])).toEqual('date');

    expect(inferTypeFromValues([null, null])).toEqual('other');
    expect(inferTypeFromValues([undefined, undefined])).toEqual('other');
    expect(inferTypeFromValues([null, undefined])).toEqual('other');
    expect(inferTypeFromValues([undefined, null])).toEqual('other');

    expect(inferTypeFromValues([{}])).toEqual('other');
    expect(inferTypeFromValues([3, {}])).toEqual('other');
  });
});

describe('inferDataFrameFromRows', () => {
  it('basically works', () => {
    function check(rows: any[], expectedColumns: Column[]) {
      const dataFrame = inferDataFrameFromRows(rows);
      expect(dataFrame.columns).toEqual(expectedColumns);
      expect(dataFrame.rows).toEqual(rows);
    }
    check([], []);
    check([{}], []);
    check([{a: 1}], [{name: 'a', type: 'integer'}]);
    check([{a: 1, b: 2}], [{name: 'a', type: 'integer'}, {name: 'b', type: 'integer'}]);
    check([{a: 1, b: 2}, {a: 3, b: 4}], [{name: 'a', type: 'integer'}, {name: 'b', type: 'integer'}]);
    check([{a: 1, b: 2}, {a: 3, b: undefined}], [{name: 'a', type: 'integer'}, {name: 'b', type: 'integer'}]);
    check([{a: 1, b: 2}, {a: 3, b: 4.5}], [{name: 'a', type: 'integer'}, {name: 'b', type: 'number'}]);
    check([{a: 1}, {a: 3, b: 4.5}], [{name: 'a', type: 'integer'}, {name: 'b', type: 'number'}]);
  });
});
