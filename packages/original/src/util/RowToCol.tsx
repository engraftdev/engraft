import { HTMLProps, memo, useEffect } from "react"
import useSize from "./useSize.js"

export const RowToCol = memo(function RowToCol(props: HTMLProps<HTMLDivElement> & {
  minRowWidth: number,
  reportIsCol?: (isCol: boolean) => void,
}) {
  const {children, className, minRowWidth, reportIsCol, ...restProps} = props

  const [sizeRef, size] = useSize();

  const isCol = size ? size.width < minRowWidth : false;

  useEffect(() => {
    if (reportIsCol) {
      reportIsCol(isCol);
    }
  }, [reportIsCol, size, isCol]);

  return (
    <div ref={sizeRef} className={(isCol ? 'xCol' : 'xRow') + ' ' + className} {...restProps}>
      {children}
    </div>
  );
})


