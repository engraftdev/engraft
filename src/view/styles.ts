import { CSSProperties } from "react";
import { Property } from "csstype";

export function flexRow(align?: 'top' | 'bottom' | 'center' | 'stretch'): CSSProperties {
  const alignItems: Property.AlignItems = align ? ({
    top: 'flex-start',
    bottom: 'flex-end',
    center: 'center',
    stretch: 'stretch',
  })[align] : 'stretch';

  return {
    display: 'flex', flexDirection: 'row', alignItems
  }
}

export function flexCol(align?: 'left' | 'right' | 'center' | 'stretch'): CSSProperties {
  const alignItems: Property.AlignItems = align ? ({
    left: 'flex-start',
    right: 'flex-end',
    center: 'center',
    stretch: 'stretch',
  })[align] : 'stretch';

  return {
    display: 'flex', flexDirection: 'column', alignItems
  }
}

export function inlineBlock(): CSSProperties {
  return {
    display: 'inline-block'
  }
}