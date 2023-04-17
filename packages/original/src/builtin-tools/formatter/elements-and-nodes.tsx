import { EngraftPromise, runTool, ToolProgram, Var, VarBindings } from "@engraft/core";
import { useRefunction } from "@engraft/refunc-react";
import { createContext, CSSProperties, memo, ReactNode, useContext, useMemo } from "react";
import { ErrorBoundary } from "../../util/ErrorBoundary.js";
import { hashId, updateById } from "../../util/id.js";
import { identity } from "../../util/noOp.js";
import { Use } from "../../util/Use.js";
import useHover from "../../util/useHover.js";
import { ToolOutputBuffer } from "../../view/Value.js";


// **************
// * DATA STUFF *
// **************

// tricky q: should scope be part of the node? (that's how the interface presents it, but
//   internally, it's more coherent to think of them separately)

export type FormatterElement = {
  id: string,
  scope?: string,
} & (
  | {
      type: 'element',
      tag: string,
      className: string,
      children: FormatterElement[],
    }
  | {
      type: 'for-each',
      item: FormatterElement,
    }
  | {
      type: 'text',
      rawHtml: boolean,
      // TODO: formatProgram is hacked in right now (e.g., no varBindings from above)
      formatProgram?: ToolProgram,
    }
)

export type FormatterElementOf<T> = FormatterElement & { type: T };

export type FormatterNode = {
  id: string,
  innerData: any,
  element: FormatterElement,
  children: FormatterNode[],
  ghostInfo: GhostInfo | undefined,
  controlKey?: string,
}

// this says "this node is a ghost; here's how to realize it"
export type GhostInfo = {
  realize: (rootElement: FormatterElement) => FormatterElement,
}

export function renderElementToNode(element: FormatterElement, data: any, parentId: string, useGhosts: boolean, ghostInfo?: GhostInfo | undefined): FormatterNode {
  const innerData = element.scope ? data[element.scope] : data;

  let node: FormatterNode = {
    id: hashId(parentId, element.id),
    innerData,
    element,
    children: [],
    ghostInfo,
  }

  switch (element.type) {
    case 'element':
      node.children = element.children.map((childElement) =>
        renderElementToNode(childElement, innerData, node.id, useGhosts, ghostInfo)
      );

      // add ghosts based on data type
      if (useGhosts) {
        const ghostElements = makeGhostElements(node.element, innerData, node.id);
        const ghostNodes = ghostElements.map((ghostElement) => {
          const realizeChild = (rootElement: FormatterElement) => {
            const updatedUpToParent = ghostInfo ? ghostInfo.realize(rootElement) : rootElement;
            return updateById<FormatterElementOf<'element'>>(updatedUpToParent, node.element.id,
              (old) => ({...old, children: [...old.children, ghostElement]})
            );
          };
          return renderElementToNode(ghostElement, innerData, node.id, useGhosts, { realize: realizeChild });
        });
        node.children.push(...ghostNodes);
      }
      break;
    case 'for-each':
      node.children = innerData.map((itemData: any, i: number) =>
        renderElementToNode(element.item, itemData, hashId(node.id, i), useGhosts, ghostInfo)
      );
      break;
    case 'text':
      break;
    default:
      throw new Error('waaaaat');
  }

  return node;
}

function makeGhostElements(element: FormatterElement, innerData: any, id: string): FormatterElement[] {
  if (typeof innerData === 'string' || typeof innerData === 'number') {
    if (!isTextShown(element, false)) {
      const ghostElement: FormatterElement = {
        type: 'text',
        id: hashId(id, 'text'),
        rawHtml: false,
      };
      return [ghostElement];
    }
  } else if (Array.isArray(innerData)) {
    if (!isArrayShown(element, false)) {
      const ghostElement: FormatterElement = {
        type: 'for-each',
        id: hashId(id, 'for-each'),
        item: {
          type: 'element',
          tag: 'div',
          id: hashId(id, 'for-each-div'),
          className: '',
          children: [],
        },
      };
      return [ghostElement];
    }
  } else if (typeof innerData === 'object') {
    const keysAlreadyShown = keysShown(element, false);
    return (
      Object.keys(innerData)
      .filter((key) => !keysAlreadyShown.has(key))
      .map((key) => {
        const ghostElement: FormatterElement = {
          scope: key,
          type: 'element',
          tag: 'div',
          id: hashId(id, 'key', key),
          className: '',
          children: [],
        }
        return ghostElement;
      })
    );
  } else {
    // not sure what to do with this guy; no ghosts
  }
  return [];
}

// asking the question: is the array being passed in here getting for-eached?
function isArrayShown(element: FormatterElement, preScope: boolean): boolean {
  if (preScope && element.scope) {
    return false;
  }

  switch (element.type) {
    case 'element':
      return element.children.some(child => isArrayShown(child, true));
    case 'for-each':
      return true;
    default:
      return false;
  }
}

function isTextShown(element: FormatterElement, preScope: boolean): boolean {
  if (preScope && element.scope) {
    return false;
  }

  switch (element.type) {
    case 'element':
      return element.children.some(child => isTextShown(child, true));
    case 'text':
      return true;
    default:
      return false;
  }
}

function keysShown(element: FormatterElement, preScope: boolean): Set<string> {
  if (preScope && element.scope) {
    return new Set([element.scope]);
  }

  switch (element.type) {
    case 'element':
      let keys = new Set<string>();
      element.children.forEach(child =>
        keysShown(child, true).forEach(key => keys.add(key))
      );
      return keys;
    default:
      return new Set();
  }
}


// **************
// * VIEW STUFF *
// **************

export type FormatterContextInfo =
  | {
      editMode: false,
    }
  | {
      editMode: true,
      selection: FormatterSelection | null,
      setSelection: (selection: FormatterSelection | null) => void,
    };

export type FormatterSelection = {
  nodeId: string,
  elementId: string,
};

export const FormatterContext = createContext<FormatterContextInfo>({
  editMode: false,
});


export type ControlValues = {
  [name: string]: {
    [key: string]: any,
  },
}


export type FormatterNodeViewProps = {
  node: FormatterNode,
}

export const FormatterNodeView = memo(function FormatterNodeView(props: FormatterNodeViewProps) {
  const { node } = props;
  const context = useContext(FormatterContext);

  const { element, ghostInfo } = node;

  let inner: ReactNode;
  let innerStyle: CSSProperties = {
    ...ghostInfo && { opacity: "40%" },
    wordBreak: "break-word",
  };
  switch (element.type) {
    case 'element':
      const Tag = element.tag as keyof JSX.IntrinsicElements;
      inner = (
        <Tag className={element.className}>
          {node.children.map((child, i) =>
            <FormatterNodeView key={i} node={child}/>
          )}
        </Tag>
      );
      break;
    case 'for-each':
      inner = node.children.map((child, i) =>
        <FormatterNodeView key={i} node={child}/>
      );
      break;
    case 'text':
      if (element.formatProgram) {
        inner = <ErrorBoundary>
          <ViewFormatProgram formatProgram={element.formatProgram} node={node} />
        </ErrorBoundary>;
      } else {
        let text: string;
        if (typeof node.innerData === 'string' || typeof node.innerData === 'number') {
          text = node.innerData.toString();
        } else {
          text = JSON.stringify(node.innerData);
        }
        if (element.rawHtml) {
          inner = <span style={innerStyle} dangerouslySetInnerHTML={{__html: text}} />;
        } else {
          inner = <span style={innerStyle}>{text}</span>;
        }
        break;
      }
      break;
    default:
      throw new Error('waaaaat');
  }

  if (context.editMode) {
    const isSelected = context.selection?.nodeId === node.id;
    const isElementSelected = context.selection?.elementId === element.id;

    const boxBorder = `1px ${ghostInfo ? 'dashed' : 'solid'} ${isSelected ? '#88f' : '#ccc'}`;

    return (
      <div
        className="FormatterNodeView-editbox"
        style={{
          padding: 2,
          margin: 2,
          paddingTop: 5,
          marginTop: 5,
          position: 'relative',
        }}
      >
        <div
          className="FormatterNodeView-editbox-border"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            ...isElementSelected ? { right: 0 } : { width: 50 },
            bottom: 0,
            borderTop: boxBorder,
            borderLeft: boxBorder,
            borderBottom: boxBorder,
            ...isElementSelected ? { borderRight: boxBorder } : {},
            borderRadius: 2,
          }}
        />
        <Use hook={useHover} children={([hoverRef, isHovered]) =>
          <div
            ref={hoverRef}
            className="FormatterNodeView-editbox-label"
            style={{
              position: 'absolute', top: -5, left: 2, fontSize: 8,
              color: isSelected ? '#44f' : isHovered ? "#000" : "#aaa",
              backgroundColor: 'white',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
            onClick={(ev) => {
              context.setSelection({nodeId: node.id, elementId: element.id});
              ev.stopPropagation();
            }}
          >
            {element.type}{element.scope ? ` (.${element.scope})` : ''}
          </div>
        }/>
        {inner}
      </div>
    );
  } else {
    return <>{inner}</>;
  }
});

// This function prepares var bindings for a custom format program.
export function makeVarBindingsForData(data: any): VarBindings {
  const id = "IDdata000000";
  const var_: Var = { id, label: 'data' };
  const varBindings: VarBindings = { [id]: { var_, outputP: EngraftPromise.resolve({value: data}) } };
  return varBindings;
}

// This component renders the output of custom (per-node) format programs.
const ViewFormatProgram = memo(function ViewFormatProgram(props: {
  formatProgram: ToolProgram,
  node: FormatterNode,
}) {
  const { formatProgram, node } = props;

  const varBindings = useMemo(() => makeVarBindingsForData(node.innerData), [node.innerData]);
  const { outputP } = useRefunction(runTool, { program: formatProgram, varBindings })

  return <ToolOutputBuffer outputP={outputP} renderValue={identity} />;
});
