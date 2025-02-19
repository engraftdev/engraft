// Refunction: an unopinionated interface for a function that can remember its past executions

export type Refunction<Args extends any[], Return> = (memory: RefuncMemory, ...args: Args) => Return;

export class RefuncMemory {

}

// For convenience...

export type AnyFunction = (...args: any[]) => any;

export type RefunctionLike<F extends (...args: any) => any> = Refunction<Parameters<F>, ReturnType<F>>;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Refunction = {
  fromFunction<F extends AnyFunction>(f: F): RefunctionLike<F> {
    return (_memory: RefuncMemory, ...args: Parameters<F>) => {
      return f(...args);
    };
  },
};
