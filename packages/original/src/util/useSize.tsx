import { useLayoutEffect, useState } from "react";

export default function useSize(): [(elem: HTMLElement | null) => void, DOMRectReadOnly | undefined] {
  const [domRect, setDomRect] = useState<DOMRectReadOnly | undefined>(undefined);
  const [elem, setElem] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (elem) {
      const observer = new ResizeObserver((entries) => setDomRect(entries[0].contentRect));
      observer.observe(elem);
      return () => {
        observer.disconnect();
        setDomRect(undefined);
      }
    }
  }, [elem])

  return [setElem, domRect];
}
