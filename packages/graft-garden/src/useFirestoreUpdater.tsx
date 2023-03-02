import { DocumentReference, refEqual, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef } from "react";

export function useFirestoreUpdater<T>(docRefer: DocumentReference<T>, value: T | undefined): (f: (old: T) => T) => void {
  // de-dupe the document reference
  docRefer = useDeduped(docRefer, refEqual);

  // mutable ref to keep track of value, even when there are multiple updates in a tick
  const valueRef = useRef<T | undefined>(undefined);

  // keep it in sync with the value on ticks
  useEffect(() => {
    valueRef.current = value;
  } , [value]);

  const update = useCallback((f: (oldValue: T) => T) => {
    if (!valueRef.current) {
      console.warn('updater called on uninitialized value; nothing will happen');
      return;
    }
    const oldValue = valueRef.current;
    const newValue = f(oldValue);
    if (newValue === oldValue) {
      return;
    }
    valueRef.current = newValue;
    setDoc(docRefer, newValue);
  }, [docRefer]);

  return update;
}


type Eq<T> = (x1: T, x2: T) => boolean;

export default function useDeduped<T>(t: T, eq: Eq<T>): T {
  const lastT = useRef<T>();

  if (!lastT.current || (t !== lastT.current && !eq(t, lastT.current))) {
    lastT.current = t;
  }

  return lastT.current;
}
