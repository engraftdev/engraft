import { Incr, Ref } from ".";

// a way to make mentos using React-hook-like sugar

export function hooks<Args extends unknown[], Return>(f: (...args: Args) => Return): Incr<Args, Return> {
  return (memory: Ref<HookPath | undefined>, ...args) => {
    if (!memory.current) {
      memory.current = createHookPath();
    }
    return runWithPath(() => f(...args), memory.current);
  };
}

// fundamental hook

export function hookRef<T>(init: () => T, label?: string): Ref<T> {
  const position = getPathPosition();

  if (position.path.firstRun) {
    const ref: Ref = { label, current: init() };
    position.path.refs[position.index] = ref;
    position.index++;
    return ref;
  } else {
    const ref: Ref | undefined = position.path.refs[position.index];
    if (!ref) {
      throw new Error(`Hooks: Ran off end of path with ${position.index + 1} refs`);
    }
    position.index++;
    return ref;
  }
};


////////////////////
// INTERNAL TYPES //
////////////////////

export type HookPath = {
  firstRun?: true,
  refs: Ref[]
};

export function createHookPath(): HookPath {
  return {
    firstRun: true,
    refs: [],
  };
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

  try {
    return f();
  } finally {
    GLOBAL_PATH_POSITION = oldPosition;

    if (!path.firstRun && newPosition.index !== newPosition.path.refs.length) {
      throw new Error(`Function changed number of steps between runs: ${newPosition.path.refs.length} => ${newPosition.index}`);
    }
    delete path.firstRun;
  }
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
  const forkRef: Ref<HookFork> = hookRef(() => ({}), 'hookFork');
  const fork = forkRef.current;

  let keysUsed: {[key: string]: true} = {};

  const group: ForkAccess = {
    branch<Return>(key: string, f: () => Return): Return {
      if (keysUsed[key]) {
        throw new Error(`Key ${key} used twice in keyedGroups`);
      }
      keysUsed[key] = true;

      if (!fork[key]) { fork[key] = createHookPath(); }
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

// Run an arbitrary incr in a hooky function, keeping its memory between runs.
export function hookIncr<Args extends unknown[], Return>(incr: Incr<Args, Return>, ...args: Args): Return {
  const memory = hookRef(() => undefined, 'hookIncr');
  return incr(memory, ...args);
}
