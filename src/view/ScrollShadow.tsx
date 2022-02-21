import { HTMLProps, ReactNode, UIEvent, useCallback, useEffect, useState } from "react";

interface Props extends HTMLProps<HTMLDivElement> {
  children: ReactNode;
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
}


export default function ScrollShadow({children, shadowColor = 'rgba(0,0,0,0.2)', shadowBlur = 8, shadowSpread = 4, style, ...props}: Props) {
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

  return <div ref={setDiv} style={{...style, boxShadow}} onScroll={onScroll} {...props}>
    {children}
  </div>
}