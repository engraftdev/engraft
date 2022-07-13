import { createContext, CSSProperties, memo, ReactNode, useContext } from 'react';
import { hashId, updateById } from 'src/util/id';
import { Use } from 'src/util/Use';
import useHover from 'src/util/useHover';


// TODO: "selection = id + data" is not robust to changing data
export type Selection = {
  node: InterfaceNode;
  data: any;

  // if you're a ghost, provide this function
  // it says how to transform the root node to make you real
  realize?: (rootNode: InterfaceNode) => InterfaceNode;
}

export type InterfaceContextInfo = {
  editMode: false,
} | {
  editMode: true,

  selection: Selection | null,
  setSelection: (selection: Selection | null) => void,

  realize: (rootNode: InterfaceNode) => InterfaceNode,
};

export const InterfaceContext = createContext<InterfaceContextInfo>({
  editMode: false,
});




// tricky q: should scope be part of the node? (that's how the interface presents it, but
//   internally, it's more coherent to think of them separately)

export type InterfaceNode = (
  {
    type: 'element',
    tag: string,
    style: CSSProperties,
    children: InterfaceNode[],
  } | {
    type: 'for-each',
    item: InterfaceNode,
  } | {
    type: 'text',
    rawHtml: boolean,
  }
) & {
  id: string,
  scope?: string,
}



export interface InterfaceNodeViewProps {
  node: InterfaceNode,
  data: any,
  isGhost?: boolean,
}

export const InterfaceNodeView = memo(function InterfaceNodeView(props: InterfaceNodeViewProps) {
  const { node, data, isGhost } = props;
  const context = useContext(InterfaceContext);

  const innerData = node.scope ? data[node.scope] : data;

  let inner: ReactNode;
  switch (node.type) {
    case 'element':
      const Tag = node.tag as keyof JSX.IntrinsicElements;
      inner = (
        <Tag style={node.style}>
          {node.children.map((child, i) =>
            <InterfaceNodeView key={i} node={child} data={innerData} isGhost={isGhost}/>
          )}
          { context.editMode &&
            <GhostView node={node} innerData={innerData}/>
          }
        </Tag>
      );
      break;
    case 'for-each':
      inner = innerData.map((datum: any, i: number) =>
        <InterfaceNodeView key={i} node={node.item} data={datum} isGhost={isGhost}/>
      )
      break;
    case 'text':
      let text: string;
      if (typeof innerData === 'string' || typeof innerData === 'number') {
        text = innerData.toString();
      } else {
        text = JSON.stringify(innerData);
      }
      if (node.rawHtml) {
        inner = <span dangerouslySetInnerHTML={{__html: text}} />;
      } else {
        inner = <span>{text}</span>;
      }
      break;
    default:
      throw new Error('waaaaat');
  }

  if (context.editMode) {
    const isSelected = context.selection?.node.id === node.id && context.selection?.data === innerData;
    const boxBorder = `1px ${isGhost ? 'dashed' : 'solid'} ${isSelected ? '#88f' : '#ccc'}`;

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
              context.setSelection({
                node,
                data: innerData,

                realize: isGhost ? context.realize : undefined,
              });
            }}
          >
            {node.type}{node.scope ? ` (.${node.scope})` : ''}
          </div>
        }/>
        {inner}
      </div>
    );
  } else {
    return <>{inner}</>;
  }
});




// ghost stuff

interface GhostViewProps {
  node: InterfaceNode & {type: 'element'},  // always an 'element' node
  innerData: any,
}

const GhostView = memo(function GhostView(props: GhostViewProps) {
  const { node, innerData } = props;
  const interfaceContext = useContext(InterfaceContext) as InterfaceContextInfo & {editMode: true};  // only use GhostView in edit mode
  const { realize } = interfaceContext;

  function realizeChild(ghostNode: InterfaceNode) {
    return function(rootNode: InterfaceNode) {
      return updateById(realize(rootNode), node.id, (oldNode: InterfaceNode & {type: 'element'}) => {
        return {
          ...oldNode,
          children: [
            ...oldNode.children,
            ghostNode,
          ],
        };
      });
    }
  }

  if (typeof innerData === 'string' || typeof innerData === 'number') {
    if (isTextShown(node, false)) {
      return null;
    } else {
      const ghostNode: InterfaceNode = {
        type: 'text',
        id: hashId(node.id, 'text'),
        rawHtml: false,
      }
      // TODO: this pattern is a "ghost child" I guess
      return <InterfaceContext.Provider value={{...interfaceContext, realize: realizeChild(ghostNode)}}>
        <InterfaceNodeView node={ghostNode} data={innerData} isGhost={true}/>
      </InterfaceContext.Provider>;
    }
  } else if (Array.isArray(innerData)) {
    if (isArrayShown(node, false)) {
      return null;
    } else {
      const ghostNode: InterfaceNode = {
        type: 'for-each',
        id: hashId(node.id, 'for-each'),
        item: {
          type: 'element',
          tag: 'div',
          id: hashId(node.id, 'for-each-div'),
          style: {},
          children: [],
        },
      };
      return <InterfaceContext.Provider value={{...interfaceContext, realize: realizeChild(ghostNode)}}>
        <InterfaceNodeView node={ghostNode} data={innerData} isGhost={true}/>
      </InterfaceContext.Provider>;
    }
  } else if (typeof innerData === 'object') {
    const keysAlreadyShown = keysShown(node, false);
    return <>{Object.keys(innerData).map(key => {
      if (keysAlreadyShown.has(key)) {
        return null;
      } else {
        const ghostNode: InterfaceNode = {
          scope: key,
          type: 'element',
          tag: 'div',
          id: hashId(node.id, 'key', key),
          style: {},
          children: [],
        }
        return <InterfaceContext.Provider value={{...interfaceContext, realize: realizeChild(ghostNode)}}>
          <InterfaceNodeView node={ghostNode} data={innerData} isGhost={true}/>
        </InterfaceContext.Provider>;
      }
    })}</>;
  } else {
    return null;
  }
});

// asking the question: is the array being passed in here getting for-eached?
function isArrayShown(node: InterfaceNode, preScope: boolean): boolean {
  if (preScope && node.scope) {
    return false;
  }

  switch (node.type) {
    case 'element':
      return node.children.some(child => isArrayShown(child, true));
    case 'for-each':
      return true;
    default:
      return false;
  }
}

function isTextShown(node: InterfaceNode, preScope: boolean): boolean {
  if (preScope && node.scope) {
    return false;
  }

  switch (node.type) {
    case 'element':
      return node.children.some(child => isTextShown(child, true));
    case 'text':
      return true;
    default:
      return false;
  }
}

function keysShown(node: InterfaceNode, preScope: boolean): Set<string> {
  if (preScope && node.scope) {
    return new Set([node.scope]);
  }

  switch (node.type) {
    case 'element':
      let keys = new Set<string>();
      node.children.forEach(child =>
        keysShown(child, true).forEach(key => keys.add(key))
      );
      return keys;
    default:
      return new Set();
  }
}
