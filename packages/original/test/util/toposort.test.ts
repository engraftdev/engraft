// adapted from https://github.com/marcelklehr/toposort/blob/master/test.js

import { describe, test, expect } from 'vitest';
import { Edge, toposortFromEdges } from '../../dist/util/toposort';

function uniqueNodes(arr: Edge[]){
  var res = new Set<string>()
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i]
    res.add(edge[0])
    res.add(edge[1])
  }
  return Array.from(res)
}

describe('toposort', () => {
  test('acyclic graphs', () => {
    /*(read downwards)
    6  3
    |  |
    5->2
    |  |
    4  1
    */
    const edges: Edge[] = [
      ["3", '2'],
      ["2", "1"],
      ["6", "5"],
      ["5", "2"],
      ["5", "4"],
    ];
    const {sorted, cyclic} = toposortFromEdges(uniqueNodes(edges), edges);
    const validSorts = [
      [ '3','6','5','2','1','4' ],
      [ '3','6','5','2','4','1' ],
      [ '6','3','5','2','1','4' ],
      [ '6','5','3','2','1','4' ],
      [ '6','5','3','2','4','1' ],
      [ '6','5','4','3','2','1' ],
    ];
    expect(validSorts).toContainEqual(sorted.slice().reverse());
    expect(cyclic.size).toBe(0);
  });

  test('simple cyclic graphs', () => {
    const edges: Edge[] = [
      ["foo", 'bar'],
      ["bar", "foo"],
    ];
    const {sorted, cyclic} = toposortFromEdges(uniqueNodes(edges), edges);
    expect(sorted).toEqual([]);
    expect(cyclic).toEqual(new Set(['foo', 'bar']));
  });

  test('complex cyclic graphs', () => {
    /*
    foo
    |
    bar<-john
    |     ^
    ron->tom
    */
    const edges: Edge[] = [
      ["foo", "bar"],
      ["bar", "ron"],
      ["john", "bar"],
      ["tom", "john"],
      ["ron", "tom"],
    ];
    const {sorted, cyclic} = toposortFromEdges(uniqueNodes(edges), edges);
    expect(sorted).toEqual([]);
    expect(cyclic).toEqual(new Set(['foo', 'bar', 'john', 'ron', 'tom']));
  });

  test('complex cyclic graphs: variant', () => {
    /*
    bar<-john
    |     ^
    ron->tom
    |
    foo
    */
    const edges: Edge[] = [
      ["ron", "foo"],
      ["bar", "ron"],
      ["john", "bar"],
      ["tom", "john"],
      ["ron", "tom"],
    ];
    const {sorted, cyclic} = toposortFromEdges(uniqueNodes(edges), edges);
    expect(sorted).toEqual(['foo']);
    expect(cyclic).toEqual(new Set(['bar', 'john', 'ron', 'tom']));
  });

  test('unknown nodes in edges', () => {
    const edges: Edge[] = [
      ["foo", 'bar'],
      ["bar", "ron"],
      ["john", "bar"],
      ["tom", "john"],
      ["ron", "tom"],
    ];
    expect(() => toposortFromEdges(['bla'], edges)).toThrow();
  });

  test('triangular dependency', () => {
    /*
    a-> b
    |  /
    c<-
    */
    const edges: Edge[] = [
      ["a", 'b'],
      ["a", "c"],
      ["b", "c"],
    ];
    const {sorted, cyclic} = toposortFromEdges(uniqueNodes(edges), edges);
    expect(sorted).toEqual(['c', 'b', 'a']);
    expect(cyclic).toEqual(new Set());
  });

  test('should include unconnected nodes', () => {
    const {sorted} = toposortFromEdges(['d', 'c', 'a', 'b'], [['a', 'b'], ['b', 'c']]);
    expect(sorted).toContain('d');
  });

  // ...
});
