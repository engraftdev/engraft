import { format } from "isoformat";
import { CSSProperties, ElementType, isValidElement, memo, ReactElement, ReactNode, useCallback, useRef, useState } from "react";
import { ObjectInspector } from 'react-inspector';
import { ToolOutput } from "src/engraft";
import { count } from "src/util/count";
import { DOM } from "src/util/DOM";
import { ErrorBoundary } from "src/util/ErrorBoundary";
import { saveFile } from "src/util/saveFile";
import { Use } from "src/util/Use";
import useHover from "src/util/useHover";
import ScrollShadow from './ScrollShadow';
import { inlineBlock } from "./styles";
// import { isProbablyFunctionThing } from "src/builtin-tools-disabled/function";
import { PromiseState } from "src/engraft/EngraftPromise";
import Diagram from "src/util/Diagram";
import { hasProperty, isObject } from "src/util/hasProperty";

// HACK for Cuttle mockup
const UNFRAME_REACT_ELEMENTS = false;

export interface ValueFrameProps {
  children?: ReactNode | undefined;
  type?: string;
  innerStyle?: CSSProperties;
  outerStyle?: CSSProperties;
}

export const ValueFrame = memo(function ValueFrame({children, type, innerStyle, outerStyle}: ValueFrameProps) {
  const withShadow = <ScrollShadow
    className="ValueFrame-shadow"
    outerStyle={{...outerStyle}}
    innerStyle={{...innerStyle, overflow: 'auto'}}
    shadowMargin={0}  // TODO: I want -2, for when there are tokeny backgrounds around the shadow, but it still doesn't work
  >
    {children}
  </ScrollShadow>

  if (type) {
    return <div
      className="ValueFrame"
      style={{display: 'inline-flex', flexDirection: 'column', maxWidth: '100%', alignItems: 'start'}}
    >
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
  return <>{children}</>;
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
      <div className='xShrinkable'>
        <customizations.SubValueHandle value={value} path={path}>
          {children}
        </customizations.SubValueHandle>
      </div>
      {suffix}
    </div>;
  }

  // SPECIAL CASES

  // TODO: special-case hack which needs some generalization
  // if (isProbablyFunctionThing(value)) {
  //   return wrapInline(
  //     <div style={{background: '#e4e4e4', padding: 5, borderRadius: 5, fontSize: 13, color: '#0008'}}>
  //       function
  //     </div>
  //   );
  // }

  // TODO: an EVEN MORE special-case hack
  if (hasProperty(value, 'isDiagram') && value.isDiagram) {
    return wrapInline(
      <Diagram width={130} height={130} diagram={value} />
    );
  }

  const maybeElement = value as {} | null | undefined;
  if (isValidElement(maybeElement)) {
    return wrapInline(
      UNFRAME_REACT_ELEMENTS
      ? <ErrorBoundary>{maybeElement}</ErrorBoundary>
      : <ValueFrame type='react element'>
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
        {Number(value.toFixed(3)).toString()}
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
            style={{color: 'rgb(196, 26, 22)', ...valueFont, textIndent: -6, paddingLeft: 6, whiteSpace: 'pre-wrap'}}
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

  const classLabel = !isArray && value.constructor.name !== 'Object'
    ? <div style={{...valueFont, fontStyle: 'italic', whiteSpace: 'pre'}}>{value.constructor.name + ' '}</div>
    : undefined;

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
              {classLabel}
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
        {classLabel}
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





export type ToolOutputViewProps = {
  outputState: PromiseState<ToolOutput>;
  customizations?: ValueCustomizations;
  displayReactElementsDirectly?: boolean;
}

export const ToolOutputView = memo(function ToolValue(props: ToolOutputViewProps) {
  const {outputState, customizations, displayReactElementsDirectly} = props;

  return <ToolOutputBuffer
    outputState={outputState}
    renderValue={(value) => {
      if (displayReactElementsDirectly) {
        let maybeElement = value as object | null | undefined;
        // TODO: extra hack for formatter-tool... should think through this
        if (maybeElement && typeof maybeElement === 'object' && 'view' in maybeElement) {
          maybeElement = (maybeElement as any).view;
        };
        if (isObject(maybeElement) && isValidElement(maybeElement)) {
          return <ErrorBoundary>{maybeElement}</ErrorBoundary>;
        }
      }
      return <Value value={value} customizations={customizations}/>;
    }}
  />;
});

export type ToolOutputBufferProps = {
  outputState: PromiseState<ToolOutput>;
  renderValue: (value: any) => ReactNode;
}

export const ToolOutputBuffer = memo(function ToolValueBuffer(props: ToolOutputBufferProps) {
  const {outputState, renderValue} = props;

  const lastOutputValueRef = useRef<unknown>();
  if (outputState.status === 'fulfilled') {
    lastOutputValueRef.current = outputState.value.value;
  }

  const valueView =
    lastOutputValueRef.current !== undefined
    ? <div
        className="ToolOutputBuffer-value"
        style={{
          opacity: outputState.status === 'fulfilled' ? 1 : 0.3,
          maxWidth: '100%',
        }}
      >
        {renderValue(lastOutputValueRef.current)}
      </div>
    : <div
        className="ToolOutputBuffer-no-value"
        style={{fontSize: 13, fontStyle: 'italic'}}
      >
        no value yet
      </div>;

  return <div className="ToolOutputBuffer xCol xGap10 xAlignLeft">
    {valueView}
    {outputState.status === 'rejected' && <ErrorView error={(outputState.reason as any).toString()} />}
  </div>
});

export type ErrorProps = {
  error: string;  // TODO: ErrorView should take mysterious error objects, not strings
}

export const ErrorView = memo(function ErrorView(props: ErrorProps) {
  const {error} = props;

  const [isExpanded, setIsExpanded] = useState(false);

  const toggleIsExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [setIsExpanded, isExpanded]);

  return  <div
    style={{
      display: 'inline-block',
      fontSize: '13px',
      background: 'rgba(255, 0, 0, 0.05)',
      padding: 5,
      borderRadius: 3,
      color: 'rgba(255, 100, 100, 0.8)',
      maxWidth: '100px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      // border: '1px solid rgba(255, 0, 0, 0.2)',
      ...isExpanded && {
        maxWidth: 'none',
        overflow: 'visible',
        whiteSpace: 'pre-wrap',
      },
    }}
    onClick={toggleIsExpanded}
  >
    ⚠️ {error}
  </div>;
});
