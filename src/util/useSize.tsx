import { useLayoutEffect, useState } from "react";
import { hookToComponent } from "./Use";

export default function useSize(): [(elem: HTMLElement | null) => void, DOMRectReadOnly | undefined] {
  const [domRect, setDomRect] = useState<DOMRectReadOnly | undefined>(undefined);
  const [elem, setElem] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (elem) {
      const observer = new ResizeObserver((entries) => setDomRect(entries[0].contentRect));
      observer.observe(elem);
      return () => observer.disconnect();
    }
  }, [elem])

  return [setElem, domRect];
}
