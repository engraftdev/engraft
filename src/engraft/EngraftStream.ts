export type EngraftStream<T> = {
  get: () => T | undefined;
  subscribe: (listener: (value: T | undefined) => void) => () => void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EngraftStream = {
  of: <T>(value: T): EngraftStream<T> => {
    return {
      get: () => value,
      subscribe: (newListener) => {
        newListener(value);
        return () => {};
      },
    };
  },

  map<T, U>(ts: EngraftStream<T>, f: (value: T) => U): EngraftStream<U> {
    return new MappedStream(ts, f);
  },

  flatMap<T, U>(ts: EngraftStream<T>, f: (value: T) => EngraftStream<U>): EngraftStream<U> {
    // TODO: Shouldn't f take T | undefined?
    return new FlatMappedStream(ts, f);
  },

  lift2<T, U, V>(
    f: (t: T, u: U) => V,
    t: EngraftStream<T>, u: EngraftStream<U>,
  ): EngraftStream<V> {
    return EngraftStream.flatMap(t, (t) => EngraftStream.map(u, (u) => f(t, u)));
  },

  // TODO: performance lol
  liftArr<T, U>(ts: EngraftStream<T>[], f: (arr: (T | undefined)[]) => U): EngraftStream<U> {
    const get = () => f(ts.map((t) => t.get()));

    // subscribe to all the streams
    const listeners: ((value: U | undefined) => void)[] = [];
    const unsubscribes: (() => void)[] = [];
    for (const t of ts) {
      const unsubscribe = t.subscribe((value) => {
        for (const listener of listeners) {
          listener(f(ts.map((t) => t.get())));
        }
      });
      // TODO: I don't do anything with these lol
      unsubscribes.push(unsubscribe);
    }

    return {
      get,
      subscribe: (newListener) => {
        listeners.push(newListener);
        newListener(get());
        return () => {
          listeners.splice(listeners.indexOf(newListener), 1);
        };
      }
    };
  },

  liftArrOld<T, U>(ts: EngraftStream<T>[], f: (arr: T[]) => U): EngraftStream<U> {
    return EngraftStream.flatMap(ts[0], (t) => {
      if (ts.length === 1) {
        return EngraftStream.of(f([t]));
      } else {
        return EngraftStream.liftArrOld(ts.slice(1), (us: T[]) => f([t, ...us]));
      }
    });
  }
}

export class WritableStream<T> implements EngraftStream<T> {
  value: T | undefined = undefined;
  listeners: ((value: T | undefined) => void)[] = [];

  get(): T | undefined {
    return this.value;
  }

  subscribe(listener: (value: T | undefined) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  set(value: T | undefined): void {
    this.value = value;
    this.listeners.forEach((listener) => listener(value));
  }

  static from<T>(body: (set: (value: T | undefined) => void) => void): WritableStream<T> {
    const stream = new WritableStream<T>();
    body(stream.set.bind(stream));
    return stream;
  }
}

class MappedStream<T, U> implements EngraftStream<U> {
  constructor(
    private readonly stream: EngraftStream<T>,
    private readonly f: (value: T) => U,
  ) {}

  get(): U | undefined {
    const value = this.stream.get();
    if (value === undefined) {
      return undefined;
    }
    return this.f(value);
  }

  subscribe(listener: (value: U | undefined) => void): () => void {
    return this.stream.subscribe((value) => {
      if (value === undefined) {
        listener(undefined);
      } else {
        listener(this.f(value));
      }
    });
  }
}

class FlatMappedStream<T, U> implements EngraftStream<U> {
  constructor(
    private readonly ts: EngraftStream<T>,
    private readonly f: (value: T) => EngraftStream<U>,
  ) {}

  get(): U | undefined {
    const t = this.ts.get();
    if (t === undefined) {
      return undefined;
    }
    return this.f(t).get();
  }

  subscribe(listenerU: (value: U | undefined) => void): () => void {
    let unsubscribeUs: (() => void) | undefined = undefined;
    const unsubscribeTs = this.ts.subscribe((t) => {
      if (unsubscribeUs !== undefined) {
        unsubscribeUs();
      }
      if (t === undefined) {
        listenerU(undefined);
      } else {
        unsubscribeUs = this.f(t).subscribe(listenerU);
      }
    });
    return () => {
      if (unsubscribeUs !== undefined) {
        unsubscribeUs();
      }
      unsubscribeTs();
    };
  }
}
