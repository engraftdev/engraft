// Refunction: an unopinionated interface for a function that can remember its past executions

export type Refunction<Args extends any[], Return> = (memory: RefuncMemory, ...args: Args) => Return;

export class RefuncMemory {

}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Refunction = {
  fromFunction<Args extends any[], Return>(f: (...args: Args) => Return): Refunction<Args, Return> {
    return (_memory: RefuncMemory, ...args: Args) => {
      return f(...args);
    };
  },
};
