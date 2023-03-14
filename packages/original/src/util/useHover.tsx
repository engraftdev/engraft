import { useCallback, useLayoutEffect, useState } from "react";
import { useElementEventListener } from "./useEventListener.js";

let EVENT_LISTENER_CREATED = false;
let mouseClientX: number;
let mouseClientY: number;

export default function useHover(): [(elem: HTMLElement | null) => void, boolean, HTMLElement | null] {
  if (!EVENT_LISTENER_CREATED) {
    EVENT_LISTENER_CREATED = true;
    document.addEventListener('mousemove', (e) => {
      mouseClientX = e.clientX;
      mouseClientY = e.clientY;
    })
  }

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [elem, setElem] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (elem) {
      let box = elem.getBoundingClientRect();
      setIsHovered(
        box.left <= mouseClientX && mouseClientX <= box.right &&
        box.top <= mouseClientY && mouseClientY <= box.bottom
      )
    }
  }, [elem])

  useElementEventListener(elem, 'mouseenter', useCallback(() => setIsHovered(true), []));
  useElementEventListener(elem, 'mouseleave', useCallback(() => setIsHovered(false), []));

  return [setElem, isHovered, elem];
}
