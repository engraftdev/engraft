import { useCallback, useState } from 'react';

/*

Example usage:

  const commonWidth = useCommonWidth();

  return <div>
    <div style={{minWidth: commonWidth.width}}>
      <div ref={commonWidth.ref}>longggg boi</div>
    </div>
    <div style={{minWidth: commonWidth.width}}>
      <div ref={commonWidth.ref}>smol boi</div>
    </div>
  </div>;

You must attach the ref to the element you want to measure and the minWidth to
its container. useCommonWidth will ensure that the containers are the same size,
and large enough to hold the measured elements.

WARNING: You must not put the ref on an inline element, since ResizeObserver
won't work on those. inline-block is fine.

*/

type ElemInfo = {
  width: number,
  cleanup: () => void,
}

export function useCommonWidth() {
  const [elemInfos, setElemInfos] = useState<Map<HTMLDivElement, ElemInfo>>(new Map());

  const ref = useCallback((elem: HTMLDivElement | null) => {
    if (elem) {
      setElemInfos((oldElemInfos) => {
        if (oldElemInfos.has(elem)) {
          // nothing new happening
          return oldElemInfos;
        } else {
          // new element added
          const observer = new ResizeObserver(() => {
            setElemInfos((oldElemInfos) => {
              const oldElemInfo = oldElemInfos.get(elem);
              if (!oldElemInfo) {
                // TODO: leak? hopefully the observer is getting cleaned up soon
                return oldElemInfos;
              }
              const newElemInfo = { ...oldElemInfo, width: elem.getBoundingClientRect().width };
              const newElemInfos = new Map(oldElemInfos);
              newElemInfos.set(elem, newElemInfo);
              return newElemInfos;
            });
          });
          observer.observe(elem);
          const cleanup = () => observer.disconnect();

          const newElemInfos = new Map(oldElemInfos);
          newElemInfos.set(elem, {
            width: elem.getBoundingClientRect().width,
            cleanup,
          });
          return newElemInfos;
        }
      });
    } else {
      // some element was removed; figure out which
      setElemInfos((oldElemInfos) => {
        let newElementRects = oldElemInfos;
        for (const [elem, elemInfo] of oldElemInfos) {
          if (!document.body.contains(elem)) {
            if (newElementRects === oldElemInfos) {
              newElementRects = new Map(oldElemInfos);
            }
            elemInfo.cleanup();
            newElementRects.delete(elem);
          }
        }
        return newElementRects;
      })
    }
  }, []);

  const largestMeasuredWidth = Math.max(...[...elemInfos.values()].map((elemInfo) => elemInfo.width));
  let minWidth = elemInfos.size > 0 ? largestMeasuredWidth : 'initial' ;

  const wrap = useCallback((children: React.ReactNode, align: 'left' | 'right' | 'center') => {
    const justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    return (
      <div style={{minWidth, display: 'flex', justifyContent}}>
        <div ref={ref} style={{display: 'inline-block'}}>
          {children}
        </div>
      </div>
    );
  }, [minWidth, ref]);

  return {
    ref,
    minWidth,
    wrap,
  };
}
