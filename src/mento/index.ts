// Mento: an unopinionated interface for a function that can remember its past executions

export type Mento<Args extends any[], Return> = (memory: MentoMemory, ...args: Args) => Return;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Mento = {
  fromFunction<Args extends any[], Return>(f: (...args: Args) => Return): Mento<Args, Return> {
    return (memory: MentoMemory, ...args: Args) => {
      return f(...args);
    };
  },
};

export type MentoMemory = {
  data: object,
  // TODO: system for establishing ownership of a memory in case of concurrent access
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const MentoMemory = {
  create(): MentoMemory {
    return {
      data: {},
    };
  },
};
