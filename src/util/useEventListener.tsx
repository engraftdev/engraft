import { useEffect } from "react";

export function useWindowEventListener<K extends keyof WindowEventMap>(type: K, listener: (ev: WindowEventMap[K]) => void) {
  useEffect(() => {
    window.addEventListener(type, listener);
    return () => {
      window.removeEventListener(type, listener);
    };
  }, []);
}

export function useElementEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement | null, type: K, listener: (ev: HTMLElementEventMap[K]) => void) {
  useEffect(() => {
    if (element) {
      element.addEventListener(type, listener);
      return () => {
        element.removeEventListener(type, listener);
      };
    }
  }, [element]);
}
