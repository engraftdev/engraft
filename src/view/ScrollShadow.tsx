import { CSSProperties, HTMLProps, ReactNode, UIEvent, useCallback, useEffect, useState } from "react";

interface Props extends Omit<HTMLProps<HTMLDivElement>, 'style'> {
  children: ReactNode;
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
  innerStyle?: CSSProperties;
  outerStyle?: CSSProperties;
}


export default function ScrollShadow({children, shadowColor = 'rgba(255,255,255,1)', shadowBlur = 8, shadowSpread = 10, innerStyle, outerStyle, ...props}: Props) {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [boxShadow, setBoxShadow] = useState('')

  const updateShadows = useCallback((div: HTMLDivElement) => {
    const boxShadowBits: string[] = [];
    if (innerStyle?.boxShadow) {
      boxShadowBits.push(innerStyle.boxShadow);
    }
    if (div.scrollTop > 0) {
      boxShadowBits.push(`inset 0 ${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollTop < div.scrollHeight - div.offsetHeight - 1) {
      boxShadowBits.push(`inset 0 -${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollLeft > 0) {
      boxShadowBits.push(`inset ${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (div.scrollLeft < div.scrollWidth - div.offsetWidth - 1) {
      boxShadowBits.push(`inset -${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    setBoxShadow(boxShadowBits.join(', '));
  }, [shadowBlur, shadowColor, shadowSpread, innerStyle?.boxShadow])

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

  // quick little notes on how this works...
  // * the inner and outer divs should be the same size: small.
  // * the inner div will (potentially) scroll its contents, which is `children`.

  return <div className="ScrollShadow-outer" {...props} style={{
    ...outerStyle,
    position: 'relative'
  }}>
    <div className="ScrollShadow-inner" ref={setDiv} onScroll={onScroll} style={{
      ...innerStyle,
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
      boxShadow,
    }}/>
  </div>
}
