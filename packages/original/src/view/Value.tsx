import { ToolOutput } from "@engraft/core";
import { CSSProperties, ElementType, isValidElement, memo, ReactElement, ReactNode, useCallback, useRef, useState } from "react";
import { ObjectInspector } from "react-inspector";
import { count } from "../util/count.js";
import { DOM } from "../util/DOM.js";
import { ErrorBoundary } from "../util/ErrorBoundary.js";
import { saveFile } from "../util/saveFile.js";
import { Use } from "../util/Use.js";
import useHover from "../util/useHover.js";
import ScrollShadow from "./ScrollShadow.js";
// import { isProbablyFunctionThing } from "../builtin-tools-disabled/function.js";
import { EngraftPromise, usePromiseState } from "@engraft/core";
import { hasProperty } from "@engraft/shared/lib/hasProperty.js";
import { isObject } from "@engraft/shared/lib/isObject.js";
import Diagram from "../util/Diagram.js";
import { isoformat } from "../util/isoformat.js";
import { identity } from "../util/noOp.js";

// HACK for Cuttle mockup
const UNFRAME_REACT_ELEMENTS = false;

export type ValueFrameProps = {
  children?: ReactNode | undefined,
  type?: string,
  innerStyle?: CSSProperties,
  outerStyle?: CSSProperties,
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

export type SubValueHandleProps = {
  value: unknown,
  path: (string | number)[],
  children: ReactNode,
}

export const SubValueHandleDefault = memo(function SubValueHandleDefault({path, children}: SubValueHandleProps) {
  return <>{children}</>;
})

export function pathString(path: (string | number)[]) {
  return `$.${path.join('.')}`;
}

export type ValueCustomizations = {
  SubValueHandle: ElementType<SubValueHandleProps>,
}

export type ValueProps = {
  value: unknown,
  customizations?: ValueCustomizations,
  expandedDepth?: number,
}

const defaultCustomizations: ValueCustomizations = {
  SubValueHandle: SubValueHandleDefault,
};

export const Value = memo(function Value(props: ValueProps) {
  const {value, customizations = defaultCustomizations, expandedDepth = 2} = props;
  return <ValueInternal value={value} path={[]} customizations={customizations} isTopLevel={true} expandedLevelsLeft={expandedDepth} />
})

export type ValueInternalProps = {
  value: unknown,
  path: (string | number)[],
  prefix?: ReactNode,
  suffix?: ReactNode,
  customizations: ValueCustomizations,
  isTopLevel?: boolean,
  expandedLevelsLeft: number,
}

const ValueInternal = memo(function ValueInternal(props: ValueInternalProps) {
  const {value, path, prefix, suffix, customizations, isTopLevel, expandedLevelsLeft} = props;

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

  // TODO: special-case hack which needs some generalization
  if (hasProperty(value, 'gadgetClosure') && value.gadgetClosure) {
    return wrapInline(
      <div style={{background: '#e4e4e4', padding: 5, borderRadius: 5, fontSize: 13, color: '#0008'}}>
        gadget
      </div>
    );
  }

  // TODO: an EVEN MORE special-case hack
  if (hasProperty(value, 'isDiagram') && value.isDiagram) {
    return wrapInline(
      <Diagram width={130} height={130} diagram={value} />
    );
  }

  if (value instanceof EngraftPromise) {
    return <ValuePromise value={value as EngraftPromise<any>} prefix={prefix} expandedLevelsLeft={expandedLevelsLeft} />;
  }

  const maybeElement = value as {} | null | undefined;
  if (isValidElement(maybeElement)) {
    return wrapInline(
      UNFRAME_REACT_ELEMENTS
      ? <ErrorBoundary>{maybeElement}</ErrorBoundary>
      : <ValueFrame type='react element' innerStyle={{background: 'white'}}>
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
        {isoformat(value) ?? "Invalid Date"}
      </div>
    );
  }

  // OBJECTS & ARRAYS

  if (value instanceof Object && !(value instanceof Function)) {
    return <ValueComposite value={value} prefix={prefix} path={path} customizations={customizations} expandedLevelsLeft={expandedLevelsLeft}/>
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

const ValueComposite = memo(function ValueComposite(props: ValueInternalProps & {value: Object}) {
  const {value, path, prefix, suffix, customizations, expandedLevelsLeft} = props;
  const [isExpanded, setIsExpanded] = useState(expandedLevelsLeft > 0);

  const isArrayLike = hasProperty(value, Symbol.iterator) && hasProperty(value, 'length');

  let className: string | undefined = undefined;

  if (hasProperty(value, Symbol.toStringTag)) {
    className = value[Symbol.toStringTag] as string;
  } else if (value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
    className = value.constructor.name;
  }

  const classLabel = className &&
    <div style={{...valueFont, fontStyle: 'italic', whiteSpace: 'pre'}}>{className + ' '}</div>;

  const maxEntriesToShow = isExpanded ? 100 : 20;
  let numEntriesTotal: number;
  let entriesToShow: [string, any][] = [];
  if (isArrayLike) {
    numEntriesTotal = value.length as number;
    const numEntriesToShow = Math.min(numEntriesTotal, maxEntriesToShow);
    for (let i = 0; i < numEntriesToShow; i++) {
      entriesToShow.push([i.toString(), (value as any)[i]]);
    }
  } else if (value instanceof Map) {
    // TODO: showing keys?
    numEntriesTotal = value.size;
    entriesToShow = Array.from(value.entries()).slice(0, maxEntriesToShow);
  } else {
    const entries = Object.entries(value);
    numEntriesTotal = entries.length;
    entriesToShow = entries.slice(0, maxEntriesToShow);
  }
  const moreEntries = numEntriesTotal - entriesToShow.length;

  if (isExpanded) {
    return <>
      <div className='ValueComposite-open-row xRow' style={{width: '100%'}}>
        {prefix}
        <Use hook={useHover} children={([hoverRef, isHovered]) =>
          <div className='ValueComposite-open-row xRow' ref={hoverRef} style={{flexGrow: 1}}>
            <customizations.SubValueHandle value={value} path={path}>
              {classLabel}
              <div style={valueFont}>{isArrayLike ? '[' : '{'}</div>
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
        {entriesToShow.map(([key, value]) =>
          <div key={key} className='ValueComposite-item' style={{
            marginTop: 1,
            marginBottom: 1,
            width: '100%',
          }}>
            <ValueInternal
              value={value}
              prefix={
                !isArrayLike &&
                <div
                  className='prefix-with-key'
                  style={{display: 'inline-block', ...valueFont, marginRight: 5, whiteSpace: 'nowrap'}}
                >
                  {key}:
                </div>
              }
              suffix={
                <div style={{fontSize: 0}}>,</div>
              }
              path={path && [...path, key]}
              customizations={customizations}
              expandedLevelsLeft={expandedLevelsLeft - 1}
            />
          </div>
        )}
        {moreEntries > 0 &&
          <div style={{...valueFont, fontStyle: 'italic', opacity: 0.5}}>
            and {moreEntries} more
          </div>
        }
      </Indent>
      <div className='ValueComposite-close-row xRow' style={{width: '100%'}}>
        <div className='ValueComposite-close' style={valueFont}>{isArrayLike ? ']' : '}'}</div>
        {suffix}
      </div>
    </>;
  } else {
    let abbreviated: ReactElement;

    if (isArrayLike) {
      abbreviated = <>
        [
        <div style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}}>
          {count(value.length as number, 'element', 'elements')}
        </div>
        ]
      </>
    } else {
      abbreviated = <>
        {classLabel}
        {'{'}
        <div style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}}>
          {entriesToShow.map(([key]) => key).join(', ')}
          {moreEntries > 0 && `, and ${moreEntries} more`}
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

const ValuePromise = memo(function ValuePromise(props: {
  value: EngraftPromise<any>,
  prefix?: ReactNode,
  expandedLevelsLeft: number,
}) {
  const {value, prefix, expandedLevelsLeft} = props;

  const state = usePromiseState(value);
  const color = state.status === 'fulfilled' ? 'green' : state.status === 'rejected' ? 'red' : 'black';
  const newPrefix = <div className="xRow">
    {prefix}
    <div style={{...valueFont, fontStyle: 'italic', whiteSpace: 'pre', marginRight: 5}}>{'Promise'}</div>
    <div style={{...valueFont, fontStyle: 'italic', whiteSpace: 'pre', marginRight: 5, opacity: 0.6, color}}>{`<${state.status}>`}</div>
  </div>;
  if (state.status === 'pending') {
    return newPrefix;
  } else {
    const value = state.status === 'fulfilled' ? state.value : state.reason;
    return <ValueInternal value={value} path={[]} prefix={newPrefix} customizations={defaultCustomizations} expandedLevelsLeft={expandedLevelsLeft - 1} />;
  }
});





export type ToolOutputViewProps = {
  outputP: EngraftPromise<ToolOutput>;
  customizations?: ValueCustomizations;
  displayReactElementsDirectly?: boolean;
  valueWrapper?: (valueNode: ReactNode, value: unknown) => ReactNode;
}

export const ToolOutputView = memo(function ToolValue(props: ToolOutputViewProps) {
  const {outputP, customizations, displayReactElementsDirectly, valueWrapper = identity} = props;

  return <ToolOutputBuffer
    outputP={outputP}
    renderValue={(value) => {
      if (displayReactElementsDirectly) {
        let maybeElement = value as object | null | undefined;
        // TODO: extra hack for formatter-tool... should think through this
        if (maybeElement && typeof maybeElement === 'object' && 'view' in maybeElement) {
          maybeElement = (maybeElement as any).view;
        };
        if (isObject(maybeElement) && isValidElement(maybeElement)) {
          return valueWrapper(<ErrorBoundary>{maybeElement}</ErrorBoundary>, value);
        }
      }
      return valueWrapper(<Value value={value} customizations={customizations}/>, value);
    }}
  />;
});

export type ToolOutputBufferProps = {
  outputP: EngraftPromise<ToolOutput>;
  renderValue: (value: any) => ReactNode;
}

export const ToolOutputBuffer = memo(function ToolValueBuffer(props: ToolOutputBufferProps) {
  const {outputP, renderValue} = props;

  const outputState = usePromiseState(outputP);

  const lastOutputRef = useRef<ToolOutput>();
  if (outputState.status === 'fulfilled') {
    lastOutputRef.current = outputState.value;
  }

  const valueView =
    lastOutputRef.current !== undefined
    ? <div
        className="ToolOutputBuffer-value"
        style={{
          opacity: outputState.status === 'fulfilled' ? 1 : 0.3,
          maxWidth: '100%',
        }}
      >
        {renderValue(lastOutputRef.current.value)}
      </div>
    : <div
        className="ToolOutputBuffer-no-value"
        style={{fontSize: 13, fontStyle: 'italic', opacity: 0.3}}
      >
        no value yet
      </div>;

  return <div className="ToolOutputBuffer xCol xGap10 xAlignLeft xInlineFlex">
    {valueView}
    {outputState.status === 'rejected' && <ErrorView error={outputState.reason} />}
  </div>
});

export const ErrorView = memo(function ErrorView(props: {
  error: unknown
}) {
  const {error} = props;

  let message: string = '[unknown error]'
  let stack: string | undefined = undefined;
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (hasProperty(error, 'toString') && typeof error.toString === 'function') {
    const maybeMessage = error.toString();
    if (typeof maybeMessage === 'string') {
      message = maybeMessage;
    }
  }

  const messageFirstNewline = message.indexOf("\n");
  const messageFirstLine = messageFirstNewline === -1 ? message : message.slice(0, messageFirstNewline);

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
      maxWidth: '100%',
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
    ⚠️{' '}
    <span
      style={{fontFamily: 'monospace'}}
      dangerouslySetInnerHTML={{__html: isExpanded ? message : messageFirstLine}}
    />
    { isExpanded && stack && <details>
      <summary onClick={(e) => e.stopPropagation()}>
        Stack
      </summary>
      <span style={{fontFamily: 'monospace'}}>{stack}</span>
    </details>}
  </div>;
});
