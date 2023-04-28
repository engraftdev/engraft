import "./env.js";
// LINE ABOVE (import './env.js';) MUST BE FIRST
import { registerAllTheTools } from "@engraft/all-the-tools";
import {
  EngraftPromise,
  lookUpToolByName,
  runTool,
  slotWithProgram,
  ToolProgram,
} from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import express from "express";
import { promises as fsPromises, readFileSync } from "node:fs";
import { exit } from "node:process";
import { fileURLToPath } from "node:url";
import yargs from "yargs/yargs";
import {
  valueFromStdin,
  valueToStdout,
  varBindingsObject,
  set_json_only,
} from "../shared.js";

const { writeFile } = fsPromises;

/*

ok let's take a moment and plan how this should work
p.s. let's make it easy
* wait for entire input before loading interface

in run mode, just run the dang thing

in edit mode, we wait for the data to come in, then launch a web browser
it will show a web-app, which we will make in another package
it will also host a .txt file with the input

the front end will have a button called "save and return" which does that
not bad

*/

registerAllTheTools();

const argv = yargs(process.argv.slice(2))
  .command("* <program>", "run a program", (yargs) =>
    yargs
      .positional("program", {
        type: "string",
      })
      .options({
        edit: { type: "boolean", default: false },
        json_only: { type: "boolean", default: false },
      })
  )
  .parseSync();

const opts = argv as unknown as {
  program: string;
  edit: boolean;
  json_only: boolean;
};

let program: ToolProgram | null = null;
try {
  const programStr = readFileSync(opts.program, { encoding: "utf-8" });
  program = JSON.parse(programStr);
} catch (e) {
  // it's fine
}

async function read(stream: NodeJS.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

(async () => {
  let stdin = await read(process.stdin);
  if (opts.json_only) {
    set_json_only();
    stdin = JSON.parse(stdin);
  }
  if (!opts.edit) {
    if (program === null) {
      console.error(`No program found at ${opts.program}`);
      process.exit(1);
    }

    const varBindings = varBindingsObject([
      // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
      {
        var_: { id: "IDinput000000", label: "input" },
        outputP: EngraftPromise.resolve({ value: valueFromStdin(stdin) }),
      },
    ]);

    global.window = {} as any;

    const mem = new RefuncMemory();
    const { outputP } = runTool(mem, { program, varBindings });

    try {
      const output = await outputP;
      console.log(valueToStdout(output.value));
      exit(0);
    } catch (e) {
      console.error(e);
      exit(1);
    }
  } else {
    if (program === null) {
      program = slotWithProgram(
        lookUpToolByName("notebook").programFactory("IDinput000000")
      );
    }

    const app = express();
    const PORT = 8888;
    console.error(`Editor running at http://localhost:${PORT}/`);

    // TODO: don't love this hard-coded path
    const staticDir = fileURLToPath(new URL("../../dist", import.meta.url));
    // console.log('staticDir', staticDir);
    app.use(express.static(staticDir));
    // app.use(express.static(path.join(__dirname, '../../cli-frontend/dist')));

    app.use(express.json());

    app.get("/api/stdin", async (_req, res) => {
      // console.log("setting header");
      // idk why it's not working, but w/e
      res.setHeader("content-type", "text/plain");
      res.send(stdin);
    });

    app.get("/api/program", async (_req, res) => {
      res.send(program);
    });

    app.post("/api/program", async (req, res) => {
      // console.log('req.body', req.body)
      program = req.body;
      await writeFile(opts.program, JSON.stringify(program, null, 2), {
        encoding: "utf-8",
      });
      res.send("ok");
    });

    app.post("/api/stdout", async (req, res) => {
      console.log(req.body.value);
      res.send("ok");
      exit(0);
    });

    app.listen(PORT, function () {
      // console.log('app.listen');
    });
  }
})();
