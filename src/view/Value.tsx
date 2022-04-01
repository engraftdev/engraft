// import stringify from "json-stringify-pretty-compact";
import React, { CSSProperties, HTMLProps, isValidElement, memo, ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import ScrollShadow from './ScrollShadow';
import { ObjectInspector } from 'react-inspector';
import * as _ from 'lodash';
import ErrorBoundary from "../util/ErrorBoundary";
import { ToolValue } from "../tools-framework/tools";
import { useStateSetOnly } from "../util/state";
import { DOM } from "../util/DOM";
import { saveFile } from "../util/saveFile";
import { flexCol, flexRow, inlineBlock } from "./styles";



export const ValueFrame = memo(({children, type, style, ...props}: {type?: string} & HTMLProps<HTMLDivElement>) => {
  const withShadow = <ScrollShadow className="Value" style={{...style, overflow: 'auto'}} {...props}>
    {children}
  </ScrollShadow>

  if (type) {
    return <div style={{display: 'inline-flex', flexDirection: 'column', maxWidth: '100%', alignItems: 'start'}}>
      <div style={{height: 15, background: '#e4e4e4', fontSize: 13,
                   color: '#0008', display: 'flex',
                   borderTopLeftRadius: 5, borderTopRightRadius: 5, paddingLeft: 3, paddingRight: 3}}>
        {type}
      </div>
      <div style={{border: '1px dashed gray'}}>
        {withShadow}
      </div>
    </div>;
  } else {
    return withShadow;
  }
});


export interface ValueProps {
  value: any;
}

type ValuePresentation = {
  type: 'inline',
  inline: ReactElement,
} | {
  type: 'indented',
  open?: ReactNode,
  indented: ReactNode,
  close?: ReactNode,
}

const valueFont: CSSProperties = {
  fontSize: '11px',
  fontFamily: 'Menlo, monospace',
}

function valuePresentation({value}: {value: unknown}): ValuePresentation {
  const maybeElement = value as {} | null | undefined;

  if (isValidElement(maybeElement)) {
    return {
      type: 'indented',
      indented: <ValueFrame type='react element'>
        <ErrorBoundary>{maybeElement}</ErrorBoundary>,
      </ValueFrame>,
    }
  }

  if (value instanceof HTMLElement || value instanceof SVGSVGElement) {
    return {
      type: 'indented',
      indented: <ValueFrame type='html element'>
        <DOM>{value}</DOM>
      </ValueFrame>,
    }
  }

  if (value instanceof Blob) {
    return {
      type: 'indented',
      indented: <ValueFrame type='blob'>
        <button onClick={() => saveFile(value, 'file')}>download</button>,
      </ValueFrame>,
    }
  }

  if (value instanceof Function) {
    return {
      type: 'inline',
      inline: <ObjectInspector data={value}/>
    }
  }

  if (value instanceof Object) {
    const isArray = value instanceof Array;
    return {
      type: 'indented',
      open: <span style={valueFont}>{isArray ? '[' : '{'}</span>,
      indented: Object.entries(value).map(([key, value]) => {
        const presentation = valuePresentation({value});

        if (presentation.type === 'inline') {
          return <div style={{...flexRow()}}>
            { !isArray &&
              <div style={{...inlineBlock(), ...valueFont, marginRight: 5}}>{key}:</div>
            }
            {presentation.inline}
          </div>;
        } else {
          return <div style={{...flexCol()}}>
            <div style={{...flexRow()}}>
              { !isArray &&
                <div style={{...inlineBlock(), ...valueFont, marginRight: 5}}>{key}:</div>
              }
              {presentation.open}
            </div>
            <div style={{marginLeft: 10}}>
              {presentation.indented}
            </div>
            {presentation.close}
          </div>
        };
      }),
      close: <span style={valueFont}>{isArray ? ']' : '}'}</span>,
    };
  }

  if (typeof value === 'number') {
    return {
      type: 'inline',
      inline: <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {/* TODO: needs some work */}
        {Number(value.toFixed(3))}
      </div>
    }
  }

  if (typeof value === 'boolean') {
    return {
      type: 'inline',
      inline: <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {value ? 'true' : 'false'}
      </div>
    }
  }

  if (typeof value === 'string') {
    return {
      type: 'inline',
      inline: <ValueFrame>
        <div style={{color: 'rgb(196, 26, 22)', ...valueFont}}>
          '{value}'
        </div>
      </ValueFrame>
    }
  }

  return {
    type: 'inline',
    inline: <ValueFrame>
      <ObjectInspector data={value}/>
    </ValueFrame>,
  };
}

export const Value = memo(({value}: ValueProps): ReactElement => {
  const presentation = valuePresentation({value});

  if (presentation.type === 'inline') {
    return presentation.inline;
  } else {
    return <div style={{...flexCol()}}>
      {presentation.open}
      <div style={{marginLeft: 10}}>
        {presentation.indented}
      </div>
      {presentation.close}
    </div>
  }
});



export type ToolValueProps = Omit<HTMLProps<HTMLDivElement>, 'ref'> & {
  toolValue: ToolValue | null;
}

// TODO: awful naming huh?
export const ValueOfTool = memo(({toolValue, style, ...props}: ToolValueProps) => {
  const [lastValue, setLastValue] = useStateSetOnly<ToolValue | null>(null);

  useEffect(() => {
    if (toolValue) {
      setLastValue(toolValue);
    }
  }, [setLastValue, toolValue])

  return lastValue ?
    <div style={{
      ...style,
      opacity: toolValue === null ? 0.3 : 1,
    }} {...props}>
      <Value value={lastValue.toolValue} />
    </div> :
    <div style={{fontSize: 13, fontStyle: 'italic'}}>
      no output yet
    </div>;
});