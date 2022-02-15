import { useMemo, useState } from "react";

// React's useState returns a setter that doesn't work for function types
//   (it interprets function arguments as updaters, not new function values)
// this fixes that

export interface Setter<T> {
    set: (newT: T) => void;
    update: (update: (oldT: T) => T) => void;
}

export default function useStrictState<T>(init: T): [T, Setter<T>] {
    const [t, setT] = useState(() => init);

    const setter: Setter<T> = useMemo(() => {
        return {
            set: (newT: T) => setT(() => newT),
            update: setT
        };
    }, [])

    return [t, setter];
}

export function fromUpdater<T>(updater: (update: (oldT: T) => T) => void): Setter<T> {
    return {
        set: (newT: T) => updater(() => newT),
        update: updater
    }
}

export function fromSetterUnsafe<T>(setter: (newT: T) => void): Setter<T> {
    return {
        set: setter,
        update: () => { throw new Error('update not allowed'); }
    }
}

export function subSetter<T, K extends keyof T>(setter: Setter<T>, key: K): Setter<T[K]> {
    return {
        set: (newTK: T[K]) =>
            setter.update((oldT: T) => ({...oldT, [key]: newTK})),
        update: (update: (oldTK: T[K]) => T[K]) =>
            setter.update((oldT: T) => ({...oldT, [key]: update(oldT[key])})),
    }
}