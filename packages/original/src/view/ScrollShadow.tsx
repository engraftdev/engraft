import { CSSProperties, HTMLProps, ReactNode, Ref, UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import { mergeRefs } from "../util/mergeRefs.js";

interface Props extends Omit<HTMLProps<HTMLDivElement>, 'style'> {
  children: ReactNode;
  shadowColor?: string;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowMargin?: number;
  innerStyle?: CSSProperties;
  outerStyle?: CSSProperties;
  contentRef?: Ref<HTMLDivElement>;
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
    shadowColor = 'var(--shadow-color)',
    shadowBlur = 8,
    shadowSpread = 10,
    shadowMargin = 0,
    innerStyle, outerStyle,
    contentRef,
    ...restProps} = props;
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [scrollInfo, setScrollInfo] = useState<ScrollInfo | null>(null);

  const updateScrollInfo = useCallback((scroller: HTMLDivElement) => {
    const {scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetWidth, offsetHeight} = scroller;
    setScrollInfo({scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetWidth, offsetHeight});
  }, []);

  const onScroll = useCallback((ev: UIEvent<HTMLDivElement>) => {
    const scroller = ev.currentTarget;
    updateScrollInfo(scroller);
  }, [updateScrollInfo])

  useEffect(() => {
    if (scroller) {
      const observer = new ResizeObserver(() => updateScrollInfo(scroller));
      observer.observe(scroller);
      return () => observer.disconnect();
    }
  }, [scroller, updateScrollInfo])

  useEffect(() => {
    if (content && scroller) {
      const observer = new ResizeObserver(() => updateScrollInfo(scroller));
      observer.observe(content);
      return () => observer.disconnect();
    }
  }, [content, scroller, updateScrollInfo])

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

  return <div className="ScrollShadow-container" {...restProps} style={{
    ...outerStyle,
    position: 'relative'
  }}>
    <div className="ScrollShadow-scroller" ref={setScroller} onScroll={onScroll} style={{
      ...innerStyle,
    }}>
      <div className="ScrollShadow-content" ref={mergeRefs([setContent, contentRef || null])}>
        {children}
      </div>
    </div>
    <div style={{
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: shadowMargin,
      // TODO: That margin is required for Extractor SubValueHandles and such.
      // But it somehow makes some things that shouldn't scroll instead scroll by two pixels.
      // I tried to fix this in a number of ways and couldn't figure it out.
      boxShadow,
    }}/>
  </div>
}
