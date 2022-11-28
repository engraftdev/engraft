import { CSSProperties, HTMLProps, ReactNode, UIEvent, useCallback, useEffect, useMemo, useState } from "react";

interface Props extends Omit<HTMLProps<HTMLDivElement>, 'style'> {
  children: ReactNode;
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
  innerStyle?: CSSProperties;
  outerStyle?: CSSProperties;
}

type ScrollInfo = {
  scrollLeft: number,
  scrollTop: number,
  scrollWidth: number,
  scrollHeight: number,
  offsetWidth: number,
  offsetHeight: number,
}

export default function ScrollShadow(props: Props) {
  const {
    children,
    shadowColor = 'rgba(255,255,255,1)',
    shadowBlur = 8,
    shadowSpread = 10,
    innerStyle, outerStyle, ...restProps} = props;
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [scrollInfo, setScrollInfo] = useState<ScrollInfo | null>(null);

  const updateScrollInfo = useCallback((div: HTMLDivElement) => {
    const {scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetWidth, offsetHeight} = div;
    setScrollInfo({scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetWidth, offsetHeight});
  }, []);

  const onScroll = useCallback((ev: UIEvent<HTMLDivElement>) => {
    const div = ev.currentTarget;
    updateScrollInfo(div);
  }, [updateScrollInfo])

  useEffect(() => {
    if (div) {
      const observer = new ResizeObserver(() => updateScrollInfo(div));
      observer.observe(div);
      return () => observer.disconnect();
    }
  }, [div, updateScrollInfo])

  const boxShadow = useMemo(() => {
    if (!scrollInfo) { return undefined; }
    const {scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetWidth, offsetHeight} = scrollInfo;

    const boxShadowBits: string[] = [];
    if (innerStyle?.boxShadow) {
      boxShadowBits.push(innerStyle.boxShadow);
    }
    if (scrollTop > 0) {
      boxShadowBits.push(`inset 0 ${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (scrollTop < scrollHeight - offsetHeight - 1) {
      boxShadowBits.push(`inset 0 -${shadowBlur + shadowSpread}px ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (scrollLeft > 0) {
      boxShadowBits.push(`inset ${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    if (scrollLeft < scrollWidth - offsetWidth - 1) {
      boxShadowBits.push(`inset -${shadowBlur + shadowSpread}px 0 ${shadowBlur}px -${shadowBlur}px ${shadowColor}`);
    }
    return boxShadowBits.join(', ');
  }, [scrollInfo, innerStyle?.boxShadow, shadowColor, shadowBlur, shadowSpread]);

  // quick little notes on how this works...
  // * the inner and outer divs should be the same size: small.
  // * the inner div will (potentially) scroll its contents, which is `children`.

  return <div className="ScrollShadow-outer" {...restProps} style={{
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
