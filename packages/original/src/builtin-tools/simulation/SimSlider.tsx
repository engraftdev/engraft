import _ from "lodash";
import { memo, useMemo } from "react";
import { startDrag } from "../../util/drag.js";
import { useRefForCallback } from "../../util/useRefForCallback.js";

export type SimSliderValue =
  | { type: 'init', tick: number }
  | { type: 'from', tick: number }

function valueToX(value: SimSliderValue, stepWidth: number): number {
  switch (value.type) {
    case 'init': return (value.tick - 1) * stepWidth;
    case 'from': return value.tick * stepWidth;
  }
}

function xToValue(x: number, stepWidth: number, initTick: number): SimSliderValue {
  const tickCont = x / stepWidth;
  if (tickCont < initTick) {
    if (tickCont < 0) {
      return { type: 'init', tick: 0 };
    } else {
      return { type: 'init', tick: initTick };
    }
  } else {
    return { type: 'from', tick: Math.round(tickCont) };
  }
}

export const SimSlider = memo((props: {
  value: SimSliderValue,
  setValue: (value: SimSliderValue) => void,
  numSteps: number,
  draftTick: number | undefined,
}) => {
  const { value, setValue, numSteps, draftTick } = props;
  const draftTickRef = useRefForCallback(draftTick);

  const stepWidth = Math.min(20, 400 / numSteps);

  const darkerGray = '#B2B2B2';
  const lighterGray = '#E2E2E2';
  const selectionColor = '#3273F6';

  const onMouseDownSelection = useMemo(() => startDrag({
    init() {
      return {startX: valueToX(value, stepWidth)};
    },
    move({startX}) {
      const newX = startX + this.startDeltaX;
      setValue(xToValue(newX, stepWidth, draftTickRef.current ?? 0));
    },
    done() {},
    keepCursor: true,
  }), [draftTickRef, setValue, stepWidth, value]);

  function tickOrCircle(i: number, color: string, strokeWidth = 1) {
    if (i === 0 || i === draftTick) {
      return (
        <circle
          cx={i * stepWidth} cy={0}
          r={5}
          fill={color}
        />
      );
    } else {
      return (
        <line
          key={i}
          x1={i * stepWidth} y1={-5} x2={i * stepWidth} y2={5}
          stroke={color} strokeWidth={strokeWidth}
        />
      );
    }
  }

  return (
    <svg
      // style={{border: '1px solid gray'}}
      width={numSteps * stepWidth + 30} height={50}
    >
      <g transform={`translate(10, 30)`}>
        {/* track */}
        { draftTick !== undefined &&
          <line x1={0} y1={0} x2={draftTick * stepWidth} y2={0} stroke={lighterGray} strokeWidth={1} />
        }
        <line x1={(draftTick ?? 0) * stepWidth} y1={0} x2={numSteps * stepWidth} y2={0} stroke={darkerGray} strokeWidth={1} />
        {/* ticks */}
        {_.range(0, numSteps + 1).map((i) => tickOrCircle(i, i < (draftTick ?? 0) ? lighterGray : darkerGray))}
        {/* selection */}
        <g
          style={{userSelect: 'none', cursor: 'pointer'}}
          onMouseDown={onMouseDownSelection as any}
        >
          {value.type === 'init' && (
            <>
              <circle
                cx={value.tick * stepWidth} cy={0}
                r={5}
                fill={selectionColor}
              />
              <text
                x={value.tick * stepWidth} y={-10}
                textAnchor="middle"
                fill={selectionColor}
              >
                {value.tick}
              </text>
            </>
          )}
          {value.type === 'from' && (
            <>
              {tickOrCircle(value.tick, selectionColor, 2)}
              <text
                x={value.tick * stepWidth} y={-10}
                textAnchor="end"
                fill={selectionColor}
              >
                {value.tick}
              </text>
              {tickOrCircle(value.tick + 1, selectionColor, 2)}
              <text
                x={(value.tick + 1) * stepWidth} y={-10}
                textAnchor="start"
                fill={selectionColor}
              >
                {value.tick + 1}
              </text>
              <line
                x1={value.tick * stepWidth} y1={0} x2={(value.tick + 1) * stepWidth} y2={0}
                stroke={selectionColor} strokeWidth={2}
              />
              {/* invisible rectangle for dragging */}
              <rect
                x={value.tick * stepWidth} y={-30} width={stepWidth} height={50}
                fill="transparent"
              />
            </>
          )}
        </g>
      </g>
    </svg>
  )
})
