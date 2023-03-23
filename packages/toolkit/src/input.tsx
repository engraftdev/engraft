import { memo } from 'react';
import { CommonWidth } from './CommonWidth.js';

// There's an emerging convention of putting an "input" field at the top of a
// tool. This is a set of components to do that in a somewhat uniform way.

export const inputBackground = 'rgba(251, 251, 255)';

export const inputFrameBarBackdrop = <div className="backdrop" style={{background: inputBackground, height: '100%'}} />;

export const InputHeading = memo(function InputHeading(props: {
  slot: React.ReactElement,
  headingCommonWidth?: CommonWidth,
}) {
  const { slot, headingCommonWidth } = props;

  const icon = <div style={{ minWidth: 20, height: 20, paddingTop: 5 }}>{inputIcon}</div>;

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
  <svg version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="m40.289 56.539v10.832h27.082v-27.082h-10.832v16.25z"/>
      <path d="m9.375 17.035 7.6602-7.6602 48.75 48.75-7.6602 7.6602z"/>
      <path d="m90.625 90.625h-81.25v-40.625h10.832v29.793h59.586v-59.586h-29.793v-10.832h40.625z"/>
    </g>
  </svg>;
