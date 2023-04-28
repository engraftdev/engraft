import { describe, it, expect } from "vitest";
import * as tmp from "tmp";
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from 'node:url';
import { registerTool, slotWithCode, toolFromModule } from "@engraft/core";
import { normalizeIndent } from "@engraft/shared/lib/normalizeIndent.js";
import Slot from "@engraft/tool-slot";

const slotTool = toolFromModule(Slot);
registerTool(slotTool);

function relative(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

tmp.setGracefulCleanup();

describe('run.js', () => {
  it('basically works', () => {
    const input = normalizeIndent`
      abc
      def
      ghi
    `;

    const program = JSON.stringify(slotWithCode(
      'IDinput000000.map((x) => x.toUpperCase())'
    ));

    const programFile = tmp.fileSync();
    writeFileSync(programFile.name, program);
    const result = spawnSync(
      "node",
      [
        relative('../lib/run.js'),
        programFile.name
      ],
      {
        encoding: 'utf8',
        input,
      }
    );
    expect(result.status).toEqual(0);
    expect(result.stdout).toEqual(normalizeIndent`
      ABC
      DEF
      GHI
    `);
  });
}, {
  timeout: 2000
});
