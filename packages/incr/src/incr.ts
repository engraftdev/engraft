// Incr: an unopinionated interface for a function that can remember its past executions

export type IncrFunction<Args extends any[], Return> = (memory: IncrMemory, ...args: Args) => Return;

export class IncrMemory {

}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const IncrFunction = {
  fromFunction<Args extends any[], Return>(f: (...args: Args) => Return): IncrFunction<Args, Return> {
    return (_memory: IncrMemory, ...args: Args) => {
      return f(...args);
    };
  },
};
