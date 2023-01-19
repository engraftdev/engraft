import { Mento, MentoMemory } from ".";

// a way to make mentos using React-hook-like sugar

export function hooks<Args extends unknown[], Return>(f: (...args: Args) => Return): Mento<Args, Return> {
  return (memory, ...args) => {
    return runWithHookMemory(() => f(...args), memory.data);
  };
}

// fundamental hooks

export function hookRef<T>(init: () => T): {current: T} {
  const position = getPathPosition();

  if (position.firstRun) {
    const ref: HookRef = { current: init() };
    position.path[position.index] = ref;
    position.index++;
    return ref;
  } else {
    const ref = position.path[position.index] as HookPathStep | undefined;
    if (ref === undefined || !isMemoryRef(ref)) {
      throw new Error('Expected ref');
    }
    position.index++;
    return ref;
  }
};

export type ForkAccess = {
  branch: ForkBranchFunction,
  done(): void,
}
type ForkBranchFunction = <Return>(key: string, f: () => Return) => Return;

export function hookForkLater(): ForkAccess {
  const position = getPathPosition();

  const fork: HookFork = (() => {
    if (position.firstRun) {
      const fork: HookFork = {};
      position.path[position.index] = fork;
      position.index++;
      return fork;
    } else {
      const fork = position.path[position.index] as HookPathStep | undefined;
      if (fork === undefined || isMemoryRef(fork)) {
        throw new Error('Expected fork');
      }
      position.index++;
      return fork;
    }
  })();

  let keysUsed: {[key: string]: true} = {};

  const group: ForkAccess = {
    branch<Return>(key: string, f: () => Return): Return {
      if (keysUsed[key]) {
        throw new Error(`Key ${key} used twice in keyedGroups`);
      }
      keysUsed[key] = true;
      return runWithHookMemory(f, fork[key] || (fork[key] = { }));
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


////////////////////
// INTERNAL TYPES //
////////////////////

export type HookMemory = { path?: HookPath };

type HookPath = HookPathStep[];
type HookPathStep = HookRef | HookFork;
type HookRef = { current: any };
type HookFork = { [key: string]: HookMemory };

function isMemoryRef(step: HookPathStep): step is HookRef {
  return step.hasOwnProperty('current');
}


/////////////////////
// GLOBAL POSITION //
/////////////////////

type PathPosition = {
  path: HookPath,
  index: number,
  firstRun: boolean,
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

// TODO: exported for hooks-utility?
export function runWithHookMemory<Return>(f: () => Return, memory: HookMemory): Return {
  let firstRun = false;
  if (!memory.path) {
    memory.path = [];
    firstRun = true;
  }
  return runWithHookPath(f, memory.path, firstRun);
}

function runWithHookPath<Return>(f: () => Return, path: HookPath, firstRun: boolean): Return {
  const oldPosition = GLOBAL_PATH_POSITION;
  const position = { path, index: 0, firstRun };
  GLOBAL_PATH_POSITION = position;
  try {
    return f();
  } finally {
    // TODO: idk about the ordering of these, etc.
    if (!firstRun && position.index !== position.path.length) {
      throw new Error(`Function changed number of steps between runs: ${position.path.length} => ${position.index}`);
    }
    GLOBAL_PATH_POSITION = oldPosition;
  }
}


/////////////
// UTILITY //
/////////////

// Run an arbitrary mento in a hooky function, keeping its memory between runs.
export function hookMento<Args extends unknown[], Return>(mento: Mento<Args, Return>, ...args: Args): Return {
  const memoryRef = hookRef(() => MentoMemory.create());
  return mento(memoryRef.current, ...args);
}
