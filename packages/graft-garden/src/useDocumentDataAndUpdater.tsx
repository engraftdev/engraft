import { useDedupe } from "@engraft/shared/lib/useDedupe.js";
import { DocumentReference, refEqual as firebaseRefEqual, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

// This hook provides two important things you don't get from
// react-firebase-hooks:
// 1. It maintains a local copy of the document data so that reference equality
//    of subobjects is preserved.
// 2. The updater it returns can run multiple times in a tick without clobbering
//    intermediate states.

export function useDocumentDataAndUpdater<T>(docRef: DocumentReference<T>): [T | undefined, (f: (oldValue: T) => T) => void] {
  const [data, setData] = useState<T | undefined>(undefined);

  docRef = useDedupe(docRef, firebaseRefEqual);

  console.log("useDocumentDataAndUpdater tick");

  // Handle remote updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        const { fromCache, hasPendingWrites } = doc.metadata;

        if (!hasPendingWrites) {
          console.log("Local document state updated with remote data", {fromCache, hasPendingWrites});
          // TODO: Rather than completely replacing the data, try to re-use
          // existing subobjects to minimize recomputation work in Engraft.
          setData(doc.data());
        }
      },
      (error) => {
        // TODO: errors aren't handled well
        console.error("Unhandled error fetching document: ", error);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [docRef]);

  // Make a function that can update the document
  const updater = useCallback((f: (oldValue: T) => T) => {
    console.log("updater called");
    console.trace();
    setData((oldValue) => {
      if (!oldValue) {
        console.warn('updater called on uninitialized value; nothing will happen');
        return;
      }

      const newValue = f(oldValue);
      if (newValue === oldValue) {
        return oldValue;
      }

      // TODO: this `setDoc` might be costly; consider sending a diff
      setDoc(docRef, newValue);
      return newValue;
    });
  }, [docRef]);

  return [data, updater];
}
