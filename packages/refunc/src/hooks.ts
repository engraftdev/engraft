import { Refunction, RefuncMemory } from "./refunc.js";

// a way to make mentos using React-hook-like sugar

export function hooks<Args extends unknown[], Return>(f: (...args: Args) => Return): Refunction<Args, Return> {
  return (memory: RefuncMemory, ...args) => {
    const memoryForHooks = memory as RefuncMemory & { path?: HookPath };
    if (!memoryForHooks.path) {
      memoryForHooks.path = new HookPath();
    }
    return runWithPath(() => f(...args), memoryForHooks.path);
  };
}

// fundamental hook

export function hookRef<T>(init: () => T, label?: string): HookRef<T> {
  const position = getPathPosition();

  if (position.path.firstRun) {
    const ref: HookRef = new HookRef(init(), label);
    position.path.refs[position.index] = ref;
    position.index++;
    return ref;
  } else {
    const ref: HookRef | undefined = position.path.refs[position.index];
    if (!ref) {
      throw new Error(`Hooks: Ran off end of path with ${position.index + 1} refs`);
    }
    position.index++;
    return ref;
  }
};


export class HookRef<T = any> {
  label?: string;
  current: T;

  constructor(current: T, label?: string) {
    this.label = label;
    this.current = current;
  }
}



////////////////////
// INTERNAL TYPES //
////////////////////

export class HookPath {
  firstRun?: true = true;
  refs: HookRef[] = [];
}


/////////////////////
// GLOBAL POSITION //
/////////////////////

type PathPosition = {
  path: HookPath,
  index: number,
}
let GLOBAL_PATH_POSITION: PathPosition | null = null;
function getPathPosition(): PathPosition {
  // TODO: is this the right place to make sure we can still write to the memory?
  if (GLOBAL_PATH_POSITION === null) {
    throw new Error('Cannot use hook outside of runWithMemory');
  }
  return GLOBAL_PATH_POSITION;
}


//////////////
// INTERNAL //
//////////////

export function runWithPath<Return>(f: () => Return, path: HookPath): Return {
  const oldPosition = GLOBAL_PATH_POSITION;
  const newPosition = { path, index: 0 };
  GLOBAL_PATH_POSITION = newPosition;

  let result = f();

  // TODO: figure out how error-handling should work for hooky functions (refunctions in general?)

  GLOBAL_PATH_POSITION = oldPosition;

  if (!path.firstRun && newPosition.index !== newPosition.path.refs.length) {
    throw new Error(`Function changed number of steps between runs: ${newPosition.path.refs.length} => ${newPosition.index}`);
  }
  delete path.firstRun;

  return result;
}


/////////////
// UTILITY //
/////////////

type HookFork = { [key: string]: HookPath };

export type ForkAccess = {
  branch: ForkBranchFunction,
  done(): void,
}
type ForkBranchFunction = <Return>(key: string, f: () => Return) => Return;

export function hookForkLater(): ForkAccess {
  const forkRef: HookRef<HookFork> = hookRef(() => ({}), 'hookFork');
  const fork = forkRef.current;

  let keysUsed: {[key: string]: true} = {};

  const group: ForkAccess = {
    branch<Return>(key: string, f: () => Return): Return {
      if (keysUsed[key]) {
        throw new Error(`Key ${key} used twice in keyedGroups`);
      }
      keysUsed[key] = true;

      if (!fork[key]) { fork[key] = new HookPath(); }
      return runWithPath(f, fork[key]);
    },
    done(): void {
      // remove unused keys
      for (const key in fork) {
        if (!keysUsed[key]) {
          // TODO: finalizers?
          delete fork[key];
        }
      }
    },
  }

  return group;
}

export function hookFork<Return>(f: (branch: ForkBranchFunction) => Return): Return {
  const group = hookForkLater();
  const result = f(group.branch);
  group.done();
  return result;
}

export function hookLater(): <Return>(f: () => Return) => Return {
  const group = hookForkLater();
  return (f) => group.branch('', f)
  // We never call group.done – by construction, this fork will only ever have a single branch.
}

// Run an arbitrary refunction in a hooky function, keeping its memory between runs.
export function hookRefunction<Args extends unknown[], Return>(f: Refunction<Args, Return>, ...args: Args): Return {
  const memory = hookRef(() => new RefuncMemory(), 'hookRefunction');
  return f(memory.current, ...args);
}

// Establish a persistent memory for a shared refunction that can be used multiple times.
export function hookSharedRefunction<Args extends unknown[], Return>(f: Refunction<Args, Return>): (...args: Args) => Return {
  const memory = hookRef(() => new RefuncMemory(), 'hookSharedRefunction');
  return (...args: Args) => f(memory.current, ...args);
}