import { registerTool, slotWithCode, toolFromModule } from "@engraft/hostkit";
import { normalizeIndent } from "@engraft/shared/lib/normalizeIndent.js";
import Slot from "@engraft/tool-slot";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from 'node:url';
import * as tmp from "tmp";
import { describe, expect, it } from "vitest";

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
