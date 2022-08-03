import { createContext, CSSProperties, memo, ReactNode, useContext } from 'react';
import { hashId, updateById } from 'src/util/id';
import { updateF } from "src/util/updateF";
import { Use } from 'src/util/Use';
import useHover from 'src/util/useHover';


// **************
// * DATA STUFF *
// **************

// tricky q: should scope be part of the node? (that's how the interface presents it, but
//   internally, it's more coherent to think of them separately)

export type InterfaceElement = {
  id: string,
  scope?: string,
} & (
  {
    type: 'element',
    tag: string,
    style: CSSProperties,
    className: string,
    children: InterfaceElement[],
  } | {
    type: 'for-each',
    item: InterfaceElement,
  } | {
    type: 'text',
    rawHtml: boolean,
  }
)

export type InterfaceElementOf<T> = InterfaceElement & { type: T };

export type InterfaceNode = {
  id: string,
  innerData: any,
  element: InterfaceElement,
  children: InterfaceNode[],
  ghostInfo: GhostInfo | undefined;
}

// this says "this node is a ghost; here's how to realize it"
export type GhostInfo = {
  realize: (rootElement: InterfaceElement) => InterfaceElement,
}

export function renderElementToNode(element: InterfaceElement, data: any, parentId: string, useGhosts: boolean, ghostInfo?: GhostInfo | undefined): InterfaceNode {
  const innerData = element.scope ? data[element.scope] : data;

  let node: InterfaceNode = {
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
          const realizeChild = (rootElement: InterfaceElement) => {
            const updatedUpToParent = ghostInfo ? ghostInfo.realize(rootElement) : rootElement;
            return updateById<InterfaceElementOf<'element'>>(updatedUpToParent, node.element.id,
              updateF({children: {$push: [ghostElement]}})
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

function makeGhostElements(element: InterfaceElement, innerData: any, id: string): InterfaceElement[] {
  if (typeof innerData === 'string' || typeof innerData === 'number') {
    if (!isTextShown(element, false)) {
      const ghostElement: InterfaceElement = {
        type: 'text',
        id: hashId(id, 'text'),
        rawHtml: false,
      };
      return [ghostElement];
    }
  } else if (Array.isArray(innerData)) {
    if (!isArrayShown(element, false)) {
      const ghostElement: InterfaceElement = {
        type: 'for-each',
        id: hashId(id, 'for-each'),
        item: {
          type: 'element',
          tag: 'div',
          id: hashId(id, 'for-each-div'),
          style: {},
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
        const ghostElement: InterfaceElement = {
          scope: key,
          type: 'element',
          tag: 'div',
          id: hashId(id, 'key', key),
          style: {},
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
function isArrayShown(element: InterfaceElement, preScope: boolean): boolean {
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

function isTextShown(element: InterfaceElement, preScope: boolean): boolean {
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

function keysShown(element: InterfaceElement, preScope: boolean): Set<string> {
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

export type InterfaceContextInfo = {
  editMode: false,
} | {
  editMode: true,

  selectedNodeId: string | null,
  setSelectedNodeId: (selectedNodeId: string | null) => void,
};

export const InterfaceContext = createContext<InterfaceContextInfo>({
  editMode: false,
});



export interface InterfaceNodeViewProps {
  node: InterfaceNode,
}

export const InterfaceNodeView = memo(function InterfaceNodeView(props: InterfaceNodeViewProps) {
  const { node } = props;
  const context = useContext(InterfaceContext);

  const { element, ghostInfo } = node;

  let inner: ReactNode;
  let innerStyle: CSSProperties = ghostInfo ? { opacity: "40%", filter: "blur(0.5px)" } : {};
  switch (element.type) {
    case 'element':
      const Tag = element.tag as keyof JSX.IntrinsicElements;
      inner = (
        <Tag style={element.style} className={element.className}>
          {node.children.map((child, i) =>
            <InterfaceNodeView key={i} node={child}/>
          )}
        </Tag>
      );
      break;
    case 'for-each':
      inner = node.children.map((child, i) =>
        <InterfaceNodeView key={i} node={child}/>
      );
      break;
    case 'text':
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
    default:
      throw new Error('waaaaat');
  }

  if (context.editMode) {
    const isSelected = context.selectedNodeId === node.id;
    // todo: "semi-selected", meaning same element id but different nodeid
    const boxBorder = `1px ${ghostInfo ? 'dashed' : 'solid'} ${isSelected ? '#88f' : '#ccc'}`;

    return (
      <div
        className="InterfaceNodeView-editbox"
        style={{
          padding: 2,
          margin: 2,
          paddingTop: 5,
          marginTop: 5,
          position: 'relative',
        }}
      >
        <div
          className="InterfaceNodeView-editbox-border"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 50,
            bottom: 0,
            borderTop: boxBorder,
            borderLeft: boxBorder,
            borderBottom: boxBorder,
            borderRadius: 2,
          }}
        />
        <Use hook={useHover} children={([hoverRef, isHovered]) =>
          <div
            ref={hoverRef}
            className="InterfaceNodeView-editbox-label"
            style={{
              position: 'absolute', top: -5, left: 2, fontSize: 8,
              color: isSelected ? '#44f' : isHovered ? "#000" : "#aaa",
              backgroundColor: 'white',
              userSelect: 'none',
            }}
            onClick={() => {
              context.setSelectedNodeId(node.id)
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
