import { memo } from 'react';
import { CommonWidth } from './CommonWidth.js';

// There's an emerging convention of putting an "input" field at the top of a
// tool. This is a set of components to do that in a somewhat uniform way.

export const inputBackground = 'rgba(248, 248, 255, 0.5)';

export const inputFrameBarBackdrop = <div className="backdrop" style={{background: inputBackground, height: '100%'}} />;

export const InputHeading = memo(function InputHeading(props: {
  slot: React.ReactElement,
  headingCommonWidth?: CommonWidth,
}) {
  const { slot, headingCommonWidth } = props;

  const icon = <div style={{ width: 20, paddingTop: 3 }}>{inputIcon}</div>;

  return (
    <div
      className="xPad10 xRow xGap10"
      style={{
        background: inputBackground,
        borderBottom: '1px solid rgba(228, 228, 255)',
      }}
    >
      { headingCommonWidth
        ? headingCommonWidth.wrap(icon, 'right')
        : icon
      }
      {slot}
    </div>
  );
});

export const inputIcon =
  <svg version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
    <filter id="dilate">
      <feMorphology operator="dilate" radius="15" />
    </filter>
    <path
      style={{filter: 'url(#dilate)'}}
      d="m714.64 650h-689.64c-13.809 0-25-11.191-25-25s11.191-25 25-25h689.64l-307.32-307.32c-9.7656-9.7617-9.7656-25.59 0-35.352 9.7617-9.7656 25.59-9.7656 35.352 0l350 350c9.7656 9.7617 9.7656 25.59 0 35.352l-350 350c-9.7617 9.7656-25.59 9.7656-35.352 0-9.7656-9.7617-9.7656-25.59 0-35.352zm235.36-450h-175c-13.809 0-25-11.191-25-25s11.191-25 25-25h200c13.809 0 25 11.191 25 25v900c0 13.809-11.191 25-25 25h-200c-13.809 0-25-11.191-25-25s11.191-25 25-25h175z"
    />
  </svg>;
