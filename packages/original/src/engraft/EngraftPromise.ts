import _ from "lodash";
import { hasProperty } from "../util/hasProperty";
import { SynchronousPromise } from "synchronous-promise";

// In this file, we re-type SynchronousPromise as EngraftPromise, and give it better types.

export interface EngraftPromise<T> extends Promise<T> {
  pause: () => EngraftPromise<T>
  resume: () => EngraftPromise<T>

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): EngraftPromise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): EngraftPromise<T | TResult>;
}

export type ValueOrPromiseOfValue<T> = T | PromiseLike<T>
export type RejectedOutcome = {
  status: "rejected",
  reason: any
}
export type FulfilledOutcome<T> = {
  status: "fulfilled",
  value: T
}
export type SettledOutcome<T> = FulfilledOutcome<T> | RejectedOutcome

type UnValueOrPromiseOfValue<T> = T extends ValueOrPromiseOfValue<infer Base> ? Base : never;
type UnValueOrPromiseOfValueTuple<Tuple extends [...any[]]> = {
  [Index in keyof Tuple]: UnValueOrPromiseOfValue<Tuple[Index]>;
} & {length: Tuple['length']};

export interface SynchronousPromiseConstructor2 {
  /**
    * A reference to the prototype.
    */
  prototype: EngraftPromise<any>;

  /**
    * Creates a new Promise.
    * @param executor A callback used to initialize the promise. This callback is passed two arguments:
    * a resolve callback used resolve the promise with a value or the result of another promise,
    * and a reject callback used to reject the promise with a provided reason or error.
    */
  new <T>(executor: (resolve: (value?: T) => void, reject: (reason?: any) => void) => void): EngraftPromise<T>;

  // TODO: Per https://github.com/fluffynuts/synchronous-promise/issues/39, calling `resolve` with a
  // PromiseLike is broken. We've disabled that type, shown below:

  // new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): EngraftPromise<T>;



  /**
    * Creates a Promise that is resolved with an array of results when all of the provided Promises
    * resolve, or rejected when any Promise is rejected.
    * @param v1 An array of Promises
    * @returns A new Promise.
    */
  all<T>(v1: ValueOrPromiseOfValue<T>[]): EngraftPromise<T[]>;
  /**
   * Creates a Promise that is resolved with an array of results when all of the provided Promises
   * resolve, or rejected when any Promise is rejected.
   * @param values Any number of Promises.
   * @returns A new Promise.
   */
  // all<T>(...values: ValueOrPromiseOfValue<T>[]): EngraftPromise<T[]>;

  // TODO: Addd by Engraft
  all<Tuple extends [...any[]]>(...values: Tuple): EngraftPromise<UnValueOrPromiseOfValueTuple<Tuple>>;

  /**
    * Creates a Promise that is resolved with an array of outcome objects after all of the provided Promises
    * have settled. Each outcome object has a .status of either "fulfilled" or "rejected" and corresponding
    * "value" or "reason" properties.
    * @param v1 An array of Promises.
    * @returns A new Promise.
    */
  allSettled<T>(v1: ValueOrPromiseOfValue<T>[]): EngraftPromise<SettledOutcome<T>[]>;
  /**
   * Creates a Promise that is resolved with an array of outcome objects after all of the provided Promises
   * have settled. Each outcome object has a .status of either "fulfilled" or "rejected" and corresponding
   * "value" or "reason" properties.
   * @param values Any number of promises
   * @returns A new Promise.
   */
  allSettled<TAllSettled>(...values: ValueOrPromiseOfValue<TAllSettled>[]): EngraftPromise<SettledOutcome<TAllSettled>[]>;

  /**
    * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved
    * or rejected.
    * @param values An array of Promises.
    * @returns A new Promise.
    */
  // race<T>(values: IterableShim<T | PromiseLike<T>>): Promise<T>;

  /**
   * Creates a Promise that is resolved with the first value from the provided
   * Promises, or rejected when all provided Promises reject
    * @param v1 An array of Promises
    */
  any<T>(v1: ValueOrPromiseOfValue<T>[]): EngraftPromise<T>;
  /**
   * Creates a Promise that is resolved with the first value from the provided
   * Promises, or rejected when all provided Promises reject
   * @param values Any number of Promises
   */
  any<T>(...values: ValueOrPromiseOfValue<T>[]): EngraftPromise<T>;

  /**
    * Creates a new rejected promise for the provided reason.
    * @param reason The reason the promise was rejected.
    * @returns A new rejected Promise.
    */
  reject<T>(reason: any): EngraftPromise<T>;

  /**
    * Creates a new resolved promise for the provided value.
    * @param value A promise.
    * @returns A promise whose internal state matches the provided promise.
    */
  resolve<T>(value: T | PromiseLike<T>): EngraftPromise<T>;

  /**
    * Creates a new resolved promise .
    * @returns A resolved promise.
    */
  resolve(): EngraftPromise<void>;

  /**
    * Creates a new unresolved promise with the `resolve` and `reject` methods exposed
    * @returns An unresolved promise with the `resolve` and `reject` methods exposed
    */
  unresolved<T>(): UnresolvedEngraftPromise<T>;
}

/**
 * Interface type only exposed when using the static unresolved() convenience method
 */
interface UnresolvedEngraftPromise<T> extends EngraftPromise<T>  {
  resolve<T>(data: T): void;
  resolve(): void;
  reject<T>(data: T): void;
}

// Two new functions for working with these:

export type PromiseState<T> =
  | { status: 'pending' }
  | PromiseOutcome<T>;
export type PromiseOutcome<T> =
  | { status: 'fulfilled', value: T }
  | { status: 'rejected', reason: unknown };

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EngraftPromise = Object.assign(SynchronousPromise as any as SynchronousPromiseConstructor2, {
  state<T>(promise: EngraftPromise<T>): PromiseState<T> {
    if (!(promise instanceof EngraftPromise)) {
      throw new TypeError('EngraftPromise.state() can only be called on EngraftPromise objects');
    }

    let result: PromiseState<T> = {status: 'pending'};

    // We are using synchronous promises, so if the promise is fulfilled this will set the variable immediately.
    promise.then(
      (value) => { result = {status: 'fulfilled', value}; },
      (reason) => { result = {status: 'rejected', reason}; },
    );

    return result;
  },

  fromState<T>(state: PromiseState<T>): EngraftPromise<T> {
    if (state.status === 'pending') {
      return EngraftPromise.unresolved();
    } else if (state.status === 'fulfilled') {
      return EngraftPromise.resolve(state.value);
    } else {
      return EngraftPromise.reject(state.reason);
    }
  },

  looksLikeAPromise<T>(value: unknown): value is EngraftPromise<T> {
    return hasProperty(value, 'then') && typeof value.then === 'function';
  },

  try<T>(func: () => T | PromiseLike<T>): EngraftPromise<T> {
    return new EngraftPromise((resolve, reject) => {
      try {
        // this should just be `resolve(func())`, but https://github.com/fluffynuts/synchronous-promise/issues/39
        // here's a workaround
        const result = func();
        if (EngraftPromise.looksLikeAPromise(result)) {
          (result as EngraftPromise<T>).then(function (newResult) {
            resolve(newResult);
          }).catch(function (error) {
            reject(error);
          });
        } else {
          resolve(result as T);
        }
      } catch (e) {
        reject(e);
      }
    });
  },

  allValues<T>(promiseObject: {[key: string]: EngraftPromise<T>}): EngraftPromise<{[key: string]: T}> {
    const keys = Object.keys(promiseObject);
    const promises = Object.values(promiseObject);
    return EngraftPromise.all(promises).then((values) => {
      return _.zipObject(keys, values);
    });
  },

  // It would be nice to have something comparable to async/await for EngraftPromise.
  // You can't use async/await itself – it always returns a normal Promise.
  // You can pull this off with generators, but not with correct types.
  //   (You can't express "(yield (p: EngraftPromise<T>)): T" in TypeScript yet.)
  // So we'll leave this for later.
});
