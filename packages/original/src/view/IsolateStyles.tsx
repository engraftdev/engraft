import rootCss from './root.css?inline';
import { HTMLProps, memo } from 'react';

export const RootStyles = memo(function RootStyles() {
  return <style>
    {rootCss}
  </style>
});

// TODO: this has a div in it, which forces block layout
const IsolateStyles = memo(function IsolateStyles({children, ...props}: HTMLProps<HTMLDivElement>) {
  return <div style={{...props.style, all: 'initial'}} {...props}>
    <RootStyles/>
    <div className="live-compose-root">
      {children}
    </div>
  </div>;
})
export default IsolateStyles;