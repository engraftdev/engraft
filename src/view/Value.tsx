import { CSSProperties, ElementType, HTMLProps, isValidElement, memo, ReactElement, ReactNode, useEffect, useState } from "react";
import { ObjectInspector } from 'react-inspector';
import { ToolValue } from "../tools-framework/tools";
import { count } from "../util/count";
import { DOM } from "../util/DOM";
import { ErrorBoundary } from "../util/ErrorBoundary";
import { saveFile } from "../util/saveFile";
import { useStateSetOnly } from "../util/state";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import ScrollShadow from './ScrollShadow';
import { inlineBlock } from "./styles";
import { format } from "isoformat";

export interface ValueFrameProps {
  children?: ReactNode | undefined;
  type?: string;
  innerStyle?: CSSProperties;
  outerStyle?: CSSProperties;
}

export const ValueFrame = memo(function ValueFrame({children, type, innerStyle, outerStyle}: ValueFrameProps) {
  const withShadow = <ScrollShadow className="ValueFrame-shadow" outerStyle={{...outerStyle}} innerStyle={{...innerStyle, overflow: 'auto'}}>
    {children}
  </ScrollShadow>

  if (type) {
    return <div style={{display: 'inline-flex', flexDirection: 'column', maxWidth: '100%', alignItems: 'start'}}>
      <div style={{height: 15, background: '#e4e4e4', fontSize: 13,
                   color: '#0008', display: 'flex',
                   borderTopLeftRadius: 5, borderTopRightRadius: 5, paddingLeft: 3, paddingRight: 3}}>
        {type}
      </div>
      <div style={{border: '1px dashed gray', width: '100%'}}>
        {withShadow}
      </div>
    </div>;
  } else {
    return withShadow;
  }
});

const valueFont: CSSProperties = {
  fontSize: 11,
  fontFamily: 'Menlo, monospace',
}

export const Indent = memo(function Indent({children, style}: {children: ReactNode, style?: CSSProperties}) {
  return <div className="xCol xAlignLeft" style={{marginLeft: 10, ...style}}>
    {children}
  </div>;
});

export interface SubValueHandleProps {
  value: unknown;
  path: (string | number)[];
  children: ReactNode;
}

export const SubValueHandleDefault = memo(function SubValueHandleDefault({path, children}: SubValueHandleProps) {
  return <div title={pathString(path)} style={{minWidth: 0}}>
    {children}
  </div>
})

export function pathString(path: (string | number)[]) {
  return `$.${path.join('.')}`;
}

export interface ValueCustomizations {
  SubValueHandle: ElementType<SubValueHandleProps>;
}

export interface ValueProps {
  value: unknown;
  customizations?: ValueCustomizations;
}

export const Value = memo(function Value({value, customizations = {SubValueHandle: SubValueHandleDefault}}: ValueProps) {
  return <ValueInternal value={value} path={[]} customizations={customizations} isTopLevel={true} />
})

export interface ValueInternalProps {
  value: unknown;
  path: (string | number)[];
  prefix?: ReactNode;
  suffix?: ReactNode;
  customizations: ValueCustomizations;
  isTopLevel?: boolean;
}

const ValueInternal = memo(function ValueInternal({value, path, prefix, suffix, customizations, isTopLevel}: ValueInternalProps) {
  function wrapInline(children: ReactNode) {
    return <div className='ValueInternal-wrapInline-row xRow' style={{width: '100%'}}>
      {prefix}
      <customizations.SubValueHandle value={value} path={path}>
        {children}
      </customizations.SubValueHandle>
      {suffix}
    </div>;
  }

  // SPECIAL CASES

  const maybeElement = value as {} | null | undefined;
  if (isValidElement(maybeElement)) {
    return wrapInline(
      <ValueFrame type='react element'>
        <ErrorBoundary>{maybeElement}</ErrorBoundary>
      </ValueFrame>
    );
  }

  if (value instanceof HTMLElement || value instanceof SVGSVGElement) {
    return wrapInline(
      <ValueFrame type='html element'>
        <DOM element={value} />
      </ValueFrame>
    );
  }

  if (value instanceof Blob) {
    return wrapInline(
      <ValueFrame type='blob'>
        <button onClick={() => saveFile(value, 'file')}>download</button>
      </ValueFrame>
    );
  }

  if (value instanceof Date) {
    return wrapInline(
      <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {format(value, "Invalid Date")}
      </div>
    );
  }

  // OBJECTS & ARRAYS

  if (value instanceof Object && !(value instanceof Function)) {
    return <ValueComposite value={value} prefix={prefix} path={path} customizations={customizations}/>
  }

  // PRIMITIVE VALUES

  if (typeof value === 'number') {
    return wrapInline(
      <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {/* TODO: needs some work */}
        {Number(value.toFixed(3))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return wrapInline(
      <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {value ? 'true' : 'false'}
      </div>
    );
  }

  if (typeof value === 'string') {
    return wrapInline(
      <ValueFrame innerStyle={{...!isTopLevel && {maxHeight: 50}}}>
        <div
            className='Value-is-string'
            // todo: hacky hanging indent
            style={{color: 'rgb(196, 26, 22)', ...valueFont, textIndent: -6, paddingLeft: 6}}
          >
          '{value}'
        </div>
      </ValueFrame>
    );
  }

  return wrapInline(
    <ValueFrame>
      <ObjectInspector data={value}/>
    </ValueFrame>
  )
})

const ValueComposite = memo(function ValueComposite({value, path, prefix, suffix, customizations}: ValueInternalProps & {value: Object}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isArray = value instanceof Array;

  if (isExpanded) {
    let entries = isArray ? Array.from(value.entries()) : Object.entries(value);
    // TODO: customization of maxItems
    const maxItems = 100;
    let moreItems = 0;
    if (entries.length > maxItems) {
      moreItems = entries.length - maxItems;
      entries = entries.slice(0, maxItems);
    }

    return <>
      <div className='ValueComposite-open-row xRow' style={{width: '100%'}}>
        {prefix}
        <Use hook={useHover} children={([hoverRef, isHovered]) =>
          <div className='ValueComposite-open-row xRow' ref={hoverRef} style={{flexGrow: 1}}>
            <customizations.SubValueHandle value={value} path={path}>
              <div style={valueFont}>{isArray ? '[' : '{'}</div>
            </customizations.SubValueHandle>
            { isHovered &&
              <div
                style={{...valueFont, marginLeft: 3, cursor: 'pointer', flexGrow: 1}}
                onClick={(ev) => {
                  ev.preventDefault();
                  setIsExpanded(false);
                }}
              >
                ⊖
              </div>
            }
          </div>
        }/>
      </div>
      <Indent style={{padding: 1}}>
        {entries.map(([key, value]) =>
          <div key={key} className='ValueComposite-item' style={{
            marginTop: 1,
            marginBottom: 1,
            width: '100%',
          }}>
            <ValueInternal
              value={value}
              prefix={
                !isArray &&
                <div
                  className='prefix-with-key'
                  style={{...inlineBlock(), ...valueFont, marginRight: 5, whiteSpace: 'nowrap'}}
                  title={pathString([...path, key])}
                >
                  {key}:
                </div>
              }
              suffix={
                <div style={{fontSize: 0}}>,</div>
              }
              path={[...path, key]}
              customizations={customizations}
            />
          </div>
        )}
        {moreItems > 0 &&
          <div style={{...valueFont, fontStyle: 'italic', opacity: 0.5}}>
            and {moreItems} more
          </div>
        }
      </Indent>
      <div className='ValueComposite-close-row xRow' style={{width: '100%'}}>
        <div className='ValueComposite-close' style={valueFont}>{isArray ? ']' : '}'}</div>
        {suffix}
      </div>
    </>;
  } else {
    let abbreviated: ReactElement;

    if (isArray) {
      abbreviated = <>
        [
        <div style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}}>
          {count(value.length, 'element', 'elements')}
        </div>
        ]
      </>
    } else {
      abbreviated = <>
        {'{'}
        <div style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}}>
          {Object.keys(value).join(', ')}
        </div>
        {'}'}
      </>
    }
    return <Use hook={useHover} children={([hoverRef, isHovered]) =>
      <div className="ValueComposite-abbreviated-row xRow" ref={hoverRef} style={{flexGrow: 1}}>
        {prefix}
        <customizations.SubValueHandle value={value} path={path}>
          <div className="xRow" style={{...valueFont}}>
            {abbreviated}
          </div>
        </customizations.SubValueHandle>
        { isHovered &&
            <span
              style={{...valueFont, marginLeft: 3, cursor: 'pointer', flexGrow: 1}}
              onClick={(ev) => {
                ev.preventDefault();
                setIsExpanded(true);
              }}
            >
              ⊕
            </span>
        }
        {suffix}
      </div>
    }/>
  }
})





export type ValueOfToolProps = Omit<HTMLProps<HTMLDivElement>, 'ref'> & {
  toolValue: ToolValue | null;
  customizations?: ValueCustomizations;
}

// TODO: awful naming huh?
export const ValueOfTool = memo(function ValueOfTool({toolValue, customizations, style, ...props}: ValueOfToolProps) {
  return <ToolValueBuffer
    toolValue={toolValue}
    renderValue={(value) => <Value value={value} customizations={customizations}/>}
  />;
});

export type ToolValueBufferProps = Omit<HTMLProps<HTMLDivElement>, 'ref'> & {
  toolValue: ToolValue | null;
  renderValue: (value: any) => ReactNode;
}

export const ToolValueBuffer = memo(function ToolValueBuffer({toolValue, renderValue, style, ...props}: ToolValueBufferProps) {
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
      {renderValue(lastValue.toolValue)}
    </div> :
    <div style={{fontSize: 13, fontStyle: 'italic'}}>
      no output yet
    </div>;
});
