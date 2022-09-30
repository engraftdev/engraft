import { Dispatch, memo, MouseEvent as ReactMouseEvent, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { VarBindingsContext, newVar, ProgramFactory, ToolProgram, ToolProps, ToolOutput, ToolView, ToolViewRenderProps, Var, VarBinding } from "src/tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "src/tools-framework/useSubTool";
import { AddObjToContext } from "src/util/context";
import { newId } from "src/util/id";
import { updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "src/util/state";
import { updateF } from "src/util/updateF";
import useHover from "src/util/useHover";
import { ValueFrame, ToolOutputView } from "src/view/Value";
import { slotSetTo, summarizeSlotProgram } from "./slot";

export interface Program {
  toolName: 'chain';
  prevVar: Var;
  links: Link[];  // invariant: at least one link plz
}

interface Link {
  id: string,
  program: ToolProgram,
  blocksWide: number,
  blocksHigh: number,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const prevVar = newVar('prev');
  return {
    toolName: 'chain',
    prevVar,
    links: [
      {
        id: newId(),
        program: slotSetTo(defaultCode || ''),
        blocksWide: 2,
        blocksHigh: 1,
      },
    ],
  };
};

const BLOCK_WIDTH = 50;
const BLOCK_HEIGHT = 50;

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [links, updateLinks] = useAt(program, updateProgram, 'links');

  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolOutput | null}>({});
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});

  useOutput(reportOutput, useMemo(() => {
    if (links.length > 0) {
      const finalLink = links[links.length - 1];
      const finalOutput = outputs[finalLink.id] as ToolOutput | undefined;
      if (finalOutput) {
        return finalOutput;
      }
    }
    return null;
  }, [links, outputs]));

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <ChainView {...props} {...viewProps} outputs={outputs} views={views}/>
  }), [outputs, props, views]));

  return <>
    {links.map((link) =>
      <LinkModel
        key={link.id}
        id={link.id}
        links={links}
        updateLinks={updateLinks}
        outputs={outputs}
        updateOutputs={updateOutputs}
        updateViews={updateViews}
        prevVar={program.prevVar}
      />
    )}
  </>;
});

interface CellModelProps {
  id: string;

  links: Link[];
  updateLinks: Updater<Link[]>;

  outputs: {[id: string]: ToolOutput | null};
  updateOutputs: Updater<{[id: string]: ToolOutput | null}>;

  updateViews: Updater<{[id: string]: ToolView | null}>;

  prevVar: Var;
}

const LinkModel = memo(function LinkModel({id, links, updateLinks, outputs, updateOutputs, updateViews, prevVar}: CellModelProps) {
  const i = useMemo(() => {
    const i = links.findIndex((link) => link.id === id);
    if (i === -1) {
      throw new Error("internal error: cell not found");
    }
    return i;
  }, [id, links]);

  const [link, updateLink] = useAtIndex(links, updateLinks, i);
  const [program, updateProgram] = useAt(link, updateLink, 'program');
  const [component, view, output] = useTool({program, updateProgram})

  useEffect(() => {
    updateViews(updateF({[id]: {$set: view}}));
    return () => updateViews(updateF({$unset: [id]}));
  }, [id, view, updateViews])

  useEffect(() => {
    updateOutputs(updateF({[id]: {$set: output}}));
    return () => updateOutputs(updateF({$unset: [id]}));
  }, [id, output, updateOutputs])

  const prevOutput: ToolOutput | null | undefined = useMemo(() => {
    const prevLink: Link | undefined = links[i - 1];
    if (prevLink) {
      return outputs[prevLink.id];
    }
  }, [i, links, outputs])
  const prevVarContext = useMemo(() => {
    if (prevOutput) {
      const prevVarBinding: VarBinding = {
        var_: prevVar,
        output: prevOutput,
      };
      return {[prevVar.id]: prevVarBinding};
    } else {
      return undefined;
    }
  }, [prevOutput, prevVar])

  if (prevVarContext) {
    return <AddObjToContext context={VarBindingsContext} obj={prevVarContext}>
      {component}
    </AddObjToContext>;
  } else {
    return component;
  }
});

interface ChainViewProps extends ToolProps<Program>, ToolViewRenderProps {
  outputs: {[id: string]: ToolOutput | null};
  views: {[id: string]: ToolView | null}
}

const ChainView = memo(function ChainView(props: ChainViewProps) {
  const {program, views} = props;

  const [selectedLinkId, setSelectedLinkId] = useState<string | undefined>(undefined);
  // TODO: come up with a better autofocus mechanism which lets us set selectedLinkId when the chain
  // is first made

  return (
    <div className="Chain xCol">
      <div
        className="Chain-links xRow"
        style={{
          overflowX: 'auto'
        }}
      >
        {program.links.map((link, i) =>
          <LinkView
            {...props}
            key={link.id}
            id={link.id}
            selectedLinkId={selectedLinkId}
            setSelectedLinkId={setSelectedLinkId}
          />
        )}
      </div>
      { selectedLinkId !== undefined &&
        <div key={selectedLinkId} className="Chain-formula xRow" style={{marginTop: 4}}>
          <img src="fx.png" alt="formula symbol" height={20} style={{padding: 4}}/>
          <ShowView view={views[selectedLinkId]} />
        </div>
      }
    </div>
  );
})

interface LinkProps extends ChainViewProps {
  id: string;
  selectedLinkId: string | undefined;
  setSelectedLinkId: Dispatch<SetStateAction<string | undefined>>;
}

const LinkView = memo(function ({program, updateProgram, outputs, id, selectedLinkId, setSelectedLinkId}: LinkProps) {
  const [links, updateLinks] = useAt(program, updateProgram, 'links');
  const linkIndex = links.findIndex((link) => link.id === id);
  const [link, updateLink] = useAtIndex(links, updateLinks, linkIndex);

  const [hoverRef, isHovered] = useHover()

  const [isDragging, setIsDragging] = useState(false);

  const onClickAdd = useCallback((ev: ReactMouseEvent) => {
    // TODO: updateF / $spec nonsense
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      const newLink: Link = {
        id: newId(),
        program: slotSetTo(program.prevVar.id),
        blocksWide: link.blocksWide || 2,
        blocksHigh: link.blocksHigh || 1,
      };
      newLinks.splice(linkIndex + 1, 0, newLink);

      // TODO: side effect lol
      setSelectedLinkId(newLink.id);

      return newLinks;
    });
    ev.stopPropagation();
  }, [program.prevVar.id, link.blocksHigh, link.blocksWide, linkIndex, setSelectedLinkId, updateLinks]);

  const onClickDelete = useCallback((ev: ReactMouseEvent) => {
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      newLinks.splice(linkIndex, 1);
      return newLinks;
    });
    ev.stopPropagation();
  }, [linkIndex, updateLinks]);

  const onMouseDownResize = useCallback((ev: ReactMouseEvent) => {
    const {blocksWide: initBlocksWide, blocksHigh: initBlocksHigh} = link;
    const {clientX: initClientX, clientY: initClientY} = ev;
    const moveListener = (ev: MouseEvent) => {
      const {clientX, clientY} = ev;
      const blocksWide = Math.round((clientX - initClientX) / BLOCK_WIDTH) + initBlocksWide;
      const blocksHigh = Math.round((clientY - initClientY) / BLOCK_HEIGHT) + initBlocksHigh;
      updateKeys(updateLink, {blocksWide, blocksHigh});
    };
    const upListener = () => {
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
      setIsDragging(false);
    }
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    setIsDragging(true);
    ev.stopPropagation();
  }, [link, updateLink]);

  return (
    <div
      ref={hoverRef}
      className="ChainTool-link xCol"
      style={{
        width: link.blocksWide * BLOCK_WIDTH, height: link.blocksHigh * BLOCK_HEIGHT,
        border: '1px solid rgba(0,0,0,0.3)', boxSizing: 'border-box',
        marginLeft: linkIndex > 0 ? -1 : 0,
        minWidth: 0,
      }}
    >
      <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, display: 'flex', margin: 4 }}>
        <ToolOutputView toolOutput={outputs[link.id]}/>
      </ValueFrame>
      <div
        className="ChainTool-link-bar xRow xClickable"
        onClick={() => setSelectedLinkId(link.id === selectedLinkId ? undefined : link.id)}
        style={{
          height: 15,
          background: link.id === selectedLinkId ? 'rgba(26, 115, 232, 0.5)' : '#e4e4e4',
          fontSize: 13,
          color: '#0008',
        }}
      >
        <div className="xEllipsis" style={{marginLeft: 2}}>
          {summarizeSlotProgram(link.program as any)}
        </div>
        <div className="xExpand" style={{minWidth: 6}}></div>
        { (isHovered && links.length > 1) &&
          <div
            className="xCenter"
            onClick={onClickDelete}
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white', marginRight: 2
            }}
          >
            ×
          </div>
        }
        { isHovered &&
          <div
            className="xCenter"
            onClick={onClickAdd}
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white', marginRight: 2
            }}
          >
            +
          </div>
        }
        { (isHovered || isDragging) &&
          <div
            className="xCenter"
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white',
              cursor: 'nwse-resize',  // TODO: persist cursor during drag
            }}
            onMouseDown={onMouseDownResize}
          >
            ⤡
          </div>
        }
      </div>
    </div>
  );
})
