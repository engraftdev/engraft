import { describe, expect, it } from 'vitest';
import { SynchronousPromise } from 'synchronous-promise';
import { EngraftPromise } from '../lib/EngraftPromise';

describe('EngraftPromise', () => {
  it('calls `then` synchronously if possible', () => {
    let x = 0
    EngraftPromise.resolve(100).then((value) => x = value);
    expect(x).toBe(100);
  });

  it('calls `then` asynchronously if necessary', () => {
    let delayed100 = new EngraftPromise((resolve) => setTimeout(() => resolve(100), 10));
    return delayed100.then((value) => expect(value).toBe(100));
  })
});

describe('EngraftPromise.state', () => {
  it('works when fulfilled', () => {
    const promise = EngraftPromise.resolve(100);
    expect(EngraftPromise.state(promise)).toEqual({status: 'fulfilled', value: 100});
  });

  it('works when rejected', () => {
    const promise = EngraftPromise.reject('no good');
    expect(EngraftPromise.state(promise)).toEqual({status: 'rejected', reason: 'no good'});
  });

  it('works when pending', () => {
    const promise = new EngraftPromise(() => {});
    expect(EngraftPromise.state(promise)).toEqual({status: 'pending'});
  });
})

describe('EngraftPromise.try', () => {
  it('works when no error', () => {
    const promise = EngraftPromise.try(() => 100);
    expect(EngraftPromise.state(promise)).toEqual({status: 'fulfilled', value: 100});
  });

  it('works when error', () => {
    // eslint-disable-next-line no-throw-literal
    const promise = EngraftPromise.try(() => { throw 'no good'; });
    expect(EngraftPromise.state(promise)).toEqual({status: 'rejected', reason: 'no good'});
  });
});

describe('https://github.com/fluffynuts/synchronous-promise/issues/39', () => {
  it('Promise non-bug', () => {
    const delayP = new Promise((resolve) => setTimeout(() => resolve(100), 10));
    const resolvedWithPromiseP = new Promise((resolve) => resolve(delayP));
    return resolvedWithPromiseP.then((value) => expect(value).toBe(100));
  });

  it('SynchronousPromise (non-?)bug', () => {
    const delayP = new SynchronousPromise((resolve) => setTimeout(() => resolve(100), 10));
    const resolvedWithPromiseP = new SynchronousPromise((resolve) => resolve(delayP));

    let resolvedWithPromisePFulfilled = false;
    resolvedWithPromiseP.then((value) => {
      resolvedWithPromisePFulfilled = true;
    });

    const timeoutP = new Promise((resolve) => setTimeout(resolve, 25));
    return timeoutP.then(() => {
      expect(resolvedWithPromisePFulfilled).toBe(true);
    });
  });

  it('EngraftPromise.try non-bug', () => {
    const delayP = new EngraftPromise((resolve) => setTimeout(() => resolve(100), 10));
    const resolvedWithPromiseP = EngraftPromise.try(() => delayP);
    return resolvedWithPromiseP.then((value) => expect(value).toBe(100));
  });
});
