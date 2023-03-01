import { ToolProgram } from "./core";

// Engraft tools expect access to some features from their environment, like a
// registry of tools and a way to make slots. Eventually, we will want to handle
// this rigorously and flexibly. For now, we use globals.

// TODO: move tool registry to globals

const _globals = {
  slotWithCode: null as null | typeof slotWithCode,
  slotWithProgram: null as null | typeof slotWithProgram,
}

export function slotWithCode(program: string = ''): ToolProgram {
  if (!_globals.slotWithCode) {
    throw new Error('slotWithCode not set yet');
  }
  return _globals.slotWithCode(program);
}
export function setSlotWithCode(slotWithCodeNew: typeof slotWithCode) {
  _globals.slotWithCode = slotWithCodeNew;
}

export function slotWithProgram(program: ToolProgram): ToolProgram {
  if (!_globals.slotWithProgram) {
    throw new Error('slotWithProgram not set yet');
  }
  return _globals.slotWithProgram(program);
}
export function setSlotWithProgram(slotWithProgramNew: typeof slotWithProgram) {
  _globals.slotWithProgram = slotWithProgramNew;
}
