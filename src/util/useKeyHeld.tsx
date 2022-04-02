import { useEffect, useState } from "react";

export function useKeyHeld(targetKey: string) {
  const [keyHeld, setKeyHeld] = useState(false);
  useEffect(() => {
    function downHandler(ev: KeyboardEvent) {
      if (ev.key === targetKey) {
        setKeyHeld(true);
      }
    }
    function upHandler(ev: KeyboardEvent) {
      if (ev.key === targetKey) {
        setKeyHeld(false);
      }
    }
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []);
  return keyHeld;
}