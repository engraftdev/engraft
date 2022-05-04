import { Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { EnvContext, newVarConfig, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps, VarConfig } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { AddObjToContext } from "../util/context";
import { newId } from "../util/id";
import { updateKeys, Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";
import { updateF } from "../util/updateF";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import { flexCol } from "../view/styles";
import { ValueFrame, ValueOfTool } from "../view/Value";
import { CodeConfig, codeConfigSetTo, summarizeCodeConfig } from "./CodeTool";

export interface Chain2Config {
  toolName: 'chain2';
  prevVar: VarConfig;
  links: Link[];
}

interface Link {
  id: string,
  config: ToolConfig,
  blocksWide: number,
  blocksHigh: number,
}

const BLOCK_WIDTH = 50;
const BLOCK_HEIGHT = 50;


export const Chain2Tool = memo(function Chain2Tool(props: ToolProps<Chain2Config>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [links, updateLinks] = useAt(config, updateConfig, 'links');

  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});

  const output = useMemo(() => {
    if (links.length > 0) {
      const finalLink = links[links.length - 1];
      const finalOutput = outputs[finalLink.id] as ToolValue | undefined;
      if (finalOutput) {
        return finalOutput;
      }
    }
    return null;
  }, [links, outputs])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback((viewProps) => (
    <Chain2View {...props} {...viewProps} outputs={outputs} views={views}/>
  ), [outputs, props, views]);
  useView(reportView, view);

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
        prevVar={config.prevVar}
      />
    )}
  </>;
});
registerTool<Chain2Config>(Chain2Tool, 'chain2', (defaultInput) => {
  const prevVar = newVarConfig('prev');
  return {
    toolName: 'chain2',
    prevVar,
    links: [
      {
        id: newId(),
        config: codeConfigSetTo(defaultInput || ''),
        blocksWide: 2,
        blocksHigh: 1,
      },
    ],
  };
});

interface CellModelProps {
  id: string;

  links: Link[];
  updateLinks: Updater<Link[]>;

  outputs: {[id: string]: ToolValue | null};
  updateOutputs: Updater<{[id: string]: ToolValue | null}>;

  updateViews: Updater<{[id: string]: ToolView | null}>;

  prevVar: VarConfig;
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
  const [config, updateConfig] = useAt(link, updateLink, 'config');
  const [component, view, output] = useTool({config, updateConfig})

  useEffect(() => {
    updateViews(updateF({[id]: {$set: view}}));
    return () => updateViews(updateF({$unset: [id]}));
  }, [id, view, updateViews])

  useEffect(() => {
    updateOutputs(updateF({[id]: {$set: output}}));
    return () => updateOutputs(updateF({$unset: [id]}));
  }, [id, output, updateOutputs])

  const prevVal: ToolValue | null | undefined = useMemo(() => {
    const prevLink: Link | undefined = links[i - 1];
    if (prevLink) {
      return outputs[prevLink.id];
    }
  }, [i, links, outputs])
  const prevVarContext = useMemo(() => {
    if (prevVal) {
      const prevVarInfo = {
        config: prevVar,
        value: prevVal,
      };
      return {[prevVar.id]: prevVarInfo};
    } else {
      return undefined;
    }
  }, [prevVal, prevVar])

  if (prevVarContext) {
    return <AddObjToContext context={EnvContext} obj={prevVarContext}>
      {component}
    </AddObjToContext>;
  } else {
    return component;
  }
});

interface Chain2ViewProps extends ToolProps<Chain2Config>, ToolViewProps {
  outputs: {[id: string]: ToolValue | null};
  views: {[id: string]: ToolView | null}
}

const Chain2View = memo(function Chain2View(props: Chain2ViewProps) {
  const {config, updateConfig, views} = props;

  const [links, updateLinks] = useAt(config, updateConfig, 'links');

  const [selectedLinkId, setSelectedLinkId] = useState<string | undefined>(undefined);

  return (
    <div className="Chain2" style={{...flexCol(), padding: 10}}>
      <div
        className="Chain2-links"
        style={{
          display: 'flex',
          overflowX: 'auto'
        }}
      >
        {links.map((link, i) =>
          <LinkView
            {...props}
            key={link.id}
            id={link.id}
            selectedLinkId={selectedLinkId}
            setSelectedLinkId={setSelectedLinkId}
          />
        )}
        <ColDivider i={links.length} updateLinks={updateLinks} prevVar={config.prevVar} prevLink={links[links.length - 1]}/>
      </div>
      { selectedLinkId !== undefined &&
        <div key={selectedLinkId} className="Chain2-formula" style={{display: 'flex', marginTop: 4}}>
          <img src="fx.png" alt="formula symbol" height={20} style={{padding: 4}}/>
          <ShowView view={views[selectedLinkId]} />
        </div>
      }
    </div>
  );
})

interface LinkProps extends Chain2ViewProps {
  id: string;
  selectedLinkId: string | undefined;
  setSelectedLinkId: Dispatch<SetStateAction<string | undefined>>;
}

const LinkView = memo(function ({config, updateConfig, outputs, id, selectedLinkId, setSelectedLinkId}: LinkProps) {
  const [links, updateLinks] = useAt(config, updateConfig, 'links');
  const linkIndex = links.findIndex((link) => link.id === id);
  const [link, updateLink] = useAtIndex(links, updateLinks, linkIndex);

  const [hoverRef, isHovered] = useHover()

  const [isDragging, setIsDragging] = useState(false);

  const onClickAdd = useCallback(() => {
    // TODO: updateF / $spec nonsense
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      const newLink: Link = {
        id: newId(),
        config: codeConfigSetTo(config.prevVar.id),
        blocksWide: link.blocksWide || 2,
        blocksHigh: link.blocksHigh || 1,
      };
      newLinks.splice(linkIndex + 1, 0, newLink);
      return newLinks;
    });
  }, [config.prevVar.id, link.blocksHigh, link.blocksWide, linkIndex, updateLinks]);

  const onClickDelete = useCallback(() => {
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      newLinks.splice(linkIndex, 1);
      return newLinks;
    });
  }, [linkIndex, updateLinks]);


  return (
    <div
      ref={hoverRef}
      className="Chain2Tool-link"
      style={{
        display: 'inline-block',
        width: link.blocksWide * BLOCK_WIDTH, height: link.blocksHigh * BLOCK_HEIGHT,
        border: '1px solid rgba(0,0,0,0.3)', boxSizing: 'border-box',
        marginRight: -1,
        ...flexCol(),
      }}
    >
      <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, display: 'flex', margin: 4 }}>
        <ValueOfTool toolValue={outputs[link.id]}/>
      </ValueFrame>
      <div
        className="Chain2Tool-link-bar"
        onClick={() => setSelectedLinkId(link.id === selectedLinkId ? undefined : link.id)}
        style={{
          height: 15,
          background: link.id === selectedLinkId ? 'rgba(26, 115, 232, 0.5)' : '#e4e4e4',
          fontSize: 13,
          color: '#0008',
          display: 'flex',
          userSelect: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{marginLeft: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{summarizeCodeConfig(link.config as CodeConfig)}</div>
        <div style={{flexGrow: 1, minWidth: 6}}></div>
        {/* {onCode &&
          <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
            onClick={onCode}
          >co</div>
        } */}
        { isHovered &&
          <div
            onClick={onClickDelete}
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 2
            }}
          >
            ×
          </div>
        }
        { isHovered &&
          <div
            onClick={onClickAdd}
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 2
            }}
          >
            +
          </div>
        }
        { (isHovered || isDragging) &&
          <div
            style={{
              width: 15, background: 'rgba(26, 115, 232, 1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'nwse-resize',  // TODO: persist cursor during drag
            }}
            onMouseDown={(ev) => {
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
            }}
          >
            ⤡
          </div>
        }
      </div>
    </div>
  );
})



const ColDivider = memo(function ColDivider({i, updateLinks, prevVar, prevLink}: {i: number, updateLinks: Updater<Link[]>, prevVar: VarConfig, prevLink: Link | undefined}) {
  const onClick = useCallback(() => {
    // TODO: updateF / $spec nonsense
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      const newLink: Link = {
        id: newId(),
        config: i === 0 ? codeConfigSetTo('') : codeConfigSetTo(prevVar.id),
        blocksWide: prevLink?.blocksWide || 2,
        blocksHigh: prevLink?.blocksHigh || 1,
      };
      newLinks.splice(i, 0, newLink);
      return newLinks;
    });
  }, [i, prevLink?.blocksHigh, prevLink?.blocksWide, prevVar.id, updateLinks]);

  // const [hoverRef, isHovered] = useHover();

  return <Use hook={useHover}>
    {([hoverRef, isHovered]) =>
      <div ref={hoverRef} style={{gridRow: '1/3', width: 10, display: 'flex', flexDirection: 'row', justifyContent: 'center', cursor: 'pointer'}} onClick={onClick}>
        <div style={{borderLeft: isHovered ? `1px dashed rgba(0,0,0,0.5)` : '1px dashed rgba(0,0,0,0.2)', width: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
          {/* {true && <div style={{background: 'white', color: 'rgba(0,0,0,0.4)', position: 'relative', top: -3, pointerEvents: 'none', transform: 'rotate(90 deg)'}}>insert row</div>} */}
        </div>
      </div>
    }
    </Use>;
});
