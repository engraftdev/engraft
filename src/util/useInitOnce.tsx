import React from "react";

export default function useInitOnce<T>(init: () => T): T {
    const ref = React.useRef<T | null>(null);
    if (!ref.current) {
      ref.current = init();
    }
    return ref.current;
  }