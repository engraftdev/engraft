import rootCss from './root.css';
import highlightCss from './highlight.css';
import { HTMLProps, memo, ReactElement } from 'react';

export const RootStyles = memo(() => {
  return <style>
    {rootCss}
    {highlightCss}
  </style>
});

const IsolateStyles = memo(({children, ...props}: HTMLProps<HTMLDivElement>) => {
  return <div style={{...props.style, all: 'initial'}} {...props}>
    <RootStyles/>
    <div className="live-compose-root">
      {children}
    </div>
  </div>;
})
export default IsolateStyles;