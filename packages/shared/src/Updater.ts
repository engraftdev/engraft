export type Updater<T, U extends T = T> = (f: (oldU: U) => T) => void;
// (use U for when you know the updater is coming from an even narrower type than the output)

export type Setter<T> = (newT: T) => void;
