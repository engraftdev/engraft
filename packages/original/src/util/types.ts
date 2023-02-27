export type Replace<T, U> = Omit<T, keyof U> & U;
