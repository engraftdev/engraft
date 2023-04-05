// adapted from https://github.com/marcelklehr/toposort/blob/master/test.js

import { EngraftPromise, ProgramOf } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { Fragment } from "react";
import { describe, expect, it } from "vitest";
import { defineSimpleTool } from "../lib/simple-tool.js";

describe('simple-tool', () => {
  const knownValueTool = defineSimpleTool({
    name: 'known-value',
    fields: {
      x: 0
    },
    subTools: [],
    compute: ({fields: {x}}) => x,
    render: () => <Fragment/>,
  });

  type Program = ProgramOf<typeof knownValueTool>;

  it('memoizes output from fields', () => {
    const program: Program = {
      toolName: 'known-value',
      fields: {
        x: 10,
      },
      subTools: [],
    };

    // not ref equal, to make sure we're actually getting past memoizeProps
    const varBindings1 = {};
    const varBindings2 = {};

    const mem = new RefuncMemory();
    const results1 = knownValueTool.run(mem, { program, varBindings: varBindings1 });
    expect(EngraftPromise.state(results1.outputP)).toEqual({ status: 'fulfilled', value: { value: 10 } });
    const results2 = knownValueTool.run(mem, { program, varBindings: varBindings2 });
    expect(results1.outputP).toBe(results2.outputP);
  });

  it.todo('tests of subtools');
  it.todo('tests of etc');
});
