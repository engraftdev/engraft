// Incr: an unopinionated interface for a function that can remember its past executions

export type Incr<Args extends any[], Return> = (memory: Ref<any>, ...args: Args) => Return;

export type Ref<T = any> = { label?: string, current: T };

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Incr = {
  createMemory(): Ref {
    return { current: undefined };
  },

  fromFunction<Args extends any[], Return>(f: (...args: Args) => Return): Incr<Args, Return> {
    return (_memory: Ref, ...args: Args) => {
      return f(...args);
    };
  },
};
