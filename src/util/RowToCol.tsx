import { HTMLProps, memo } from "react"
import { Use } from "./Use"
import useSize from "./useSize"

export const RowToCol = memo(function RowToCol({children, className, minRowWidth, ...props}: HTMLProps<HTMLDivElement> & {minRowWidth: number}) {
  return <Use hook={useSize} children={([sizeRef, size]) =>
    <div ref={sizeRef} className={(size && size.width < minRowWidth ? 'xCol' : 'xRow') + ' ' + className} {...props}>
      {children}
    </div>
  }/>
})


