import { HTMLProps, ReactNode, UIEvent, useCallback, useEffect, useState } from "react";

interface Props extends HTMLProps<HTMLDivElement> {
  children: ReactNode;
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
}


export default function ScrollShadow({children, shadowColor = 'rgba(255,255,255,1)', shadowBlur = 8, shadowSpread = 10, style, ...props}: Props) {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [boxShadow, setBoxShadow] = useState('')

  const updateShadows = useCallback((div: HTMLDivElement) => {
    const boxShadowBits: string[] = [];
    if (style?.boxShadow) {
      boxShadowBits.push(style.boxShadow);
    }
    if (div.scrollTop > 0) {
      boxShadowBits.push(`inset 0 ${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollTop < div.scrollHeight - div.offsetHeight) {
      boxShadowBits.push(`inset 0 -${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollLeft > 0) {
      boxShadowBits.push(`inset ${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollLeft < div.scrollWidth - div.offsetWidth) {
      boxShadowBits.push(`inset -${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    setBoxShadow(boxShadowBits.join(', '));
  }, [shadowBlur, shadowColor, shadowSpread, style?.boxShadow])

  const onScroll = useCallback((ev: UIEvent<HTMLDivElement>) => {
    const div = ev.currentTarget;
    updateShadows(div);
  }, [updateShadows])

  useEffect(() => {
    if (div) {
      const observer = new ResizeObserver(() => updateShadows(div));
      observer.observe(div);
      return () => observer.disconnect();
    }
  }, [div, updateShadows])

  return <div {...props} style={{
    position: 'relative'
  }}>
    <div ref={setDiv} onScroll={onScroll} style={{
      ...style
    }}>
      {children}
    </div>
    <div style={{
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: -2,
      boxShadow,
    }}/>
  </div>
}