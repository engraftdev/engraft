import { useCallback, useEffect, useState } from "react";
import { useWindowEventListener } from "./useEventListener";

// Known limitation: When you leave a window and come back later, we don't know
// which keys are held so we assume none are.

// Known limitation: Cmd-tab doesn't trigger window blur, but it does capture
// the key-up for cmd if you come back to the original tab.

export function useKeyHeld(targetKey: string) {
  const [keyHeld, setKeyHeld] = useState(false);

  useWindowEventListener('keydown',
    useCallback((ev) => {
      if (ev.key === targetKey) {
        setKeyHeld(true);
      }
    }, [])
  );

  useWindowEventListener('keyup',
    useCallback((ev) => {
      if (ev.key === targetKey) {
        setKeyHeld(false);
      }
    }, [])
  );

  useWindowEventListener('blur',
    useCallback(() => {
      setKeyHeld(false);
    }, [])
  );

  return keyHeld;
}