import { VarBinding } from "@engraft/core";

let python_embedding = false;

export function set_python_embedding() {
  python_embedding = true;
}

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(
    varBindings.map((varBinding) => [varBinding.var_.id, varBinding])
  );
}

export function valueFromStdin(input: string) {
  // try to JSON parse it
  try {
    return JSON.parse(input);
  } catch (e) {}
  // otherwise, trim off whitespace and return it as lines
  return input.trim().split("\n");
}

export function valueToStdout(value: any) {
  if (!python_embedding) {
    // return it raw if it's a string
    if (typeof value === "string") {
      return value;
    }

    // return it as lines if it's an array
    if (Array.isArray(value)) {
      // string lines are raw, other lines are JSON
      const lines = value.map((line) => {
        if (typeof line === "string") {
          return line;
        }
        return JSON.stringify(line);
      });
      return lines.join("\n");
    }
  }

  // otherwise, return it as JSON
  return JSON.stringify(value, null, 2);
}

export function unescape_data(data: string) {
  data = data
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\u007e/g, "~")
    .replace(/\\u007d/g, "}")
    .replace(/\\u007c/g, "|")
    .replace(/\\u007b/g, "{")
    .replace(/\\u005f/g, "_")
    .replace(/\\u005e/g, "^")
    .replace(/\\u005d/g, "]")
    .replace(/\\u005c/g, "\\")
    .replace(/\\u005b/g, "[")
    .replace(/\\u0040/g, "@")
    .replace(/\\u003f/g, "?")
    .replace(/\\u003d/g, "=")
    .replace(/\\u003b/g, ";")
    .replace(/\\u003a/g, ":")
    .replace(/\\u002f/g, "/")
    .replace(/\\u002e/g, ".")
    .replace(/\\u002d/g, "-")
    .replace(/\\u002c/g, ",")
    .replace(/\\u002b/g, "+")
    .replace(/\\u002a/g, "*")
    .replace(/\\u0029/g, ")")
    .replace(/\\u0028/g, "(")
    .replace(/\\u0024/g, "$")
    .replace(/\\u0021/g, "!")
    .replace(/\\u0060/g, "`")
    .replace(/\\u0026/g, "&")
    .replace(/\\u0022/g, '"')
    .replace(/\\u0027/g, "'")
    .replace(/\\u003e/g, ">")
    .replace(/\\u003c/g, "<")
    .replace(/\\\\/g, "\\");
  return data;
}
