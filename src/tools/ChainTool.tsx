import React, { Fragment, memo, useCallback, useEffect, useMemo } from "react";
import { EnvContext, newVarConfig, registerTool, ToolConfig, ToolProps, ToolValue, ToolView, VarConfig } from "../tools-framework/tools";
import { ShowView, useOutput, useTool, useView } from "../tools-framework/useSubTool";
import { AddObjToContext } from "../util/context";
import { newId } from "../util/id";
import { Updater, useAt, useAtIndex, useStateUpdateOnly } from "../util/state";
import { updateF } from "../util/updateF";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import ScrollShadow from "../view/ScrollShadow";
import { ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";

export interface ChainConfig {
  toolName: 'chain';
  prevVar: VarConfig;
  links: Link[];
}

interface Link {
  id: string,
  config: ToolConfig,
}


export const ChainTool = memo(function ChainTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ChainConfig>) {
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

  const view: ToolView = useCallback(({autoFocus}) => (
    <div style={{
      padding: 10,
      display: 'grid',
      gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column',
      overflowX: 'auto'
    }}>
      {links.map((link, i) =>
        <Fragment key={link.id}>
          {/* <ColDivider i={i} updateLinks={updateLinks} prevVar={config.prevVar}/> */}
          <div className="ChainTool-tool" style={{display: 'inline-block', maxWidth: 400, height: 350, alignSelf: 'end', boxSizing: 'border-box'}}>
            <ShowView view={views[link.id]} autoFocus={autoFocus}/>
          </div>
          <div className="ChainTool-value" style={{display: 'inline-block', maxWidth: 400, height: 350, overflow: 'auto', padding: 4, border: '1px solid rgba(0,0,0,0.3)', boxSizing: 'border-box'}}>
            <ScrollShadow>
              <ValueOfTool toolValue={outputs[link.id]}/>
            </ScrollShadow>
          </div>
        </Fragment>
      )}
      <ColDivider i={links.length} updateLinks={updateLinks} prevVar={config.prevVar}/>
    </div>
  ), [config.prevVar, links, outputs, updateLinks, views]);
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
registerTool<ChainConfig>(ChainTool, 'chain', (defaultInput) => {
  const prevVar = newVarConfig('prev');
  return {
    toolName: 'chain',
    prevVar,
    links: [
      {
        id: newId(),
        config: codeConfigSetTo(defaultInput || ''),
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



const ColDivider = memo(function ColDivider({i, updateLinks, prevVar}: {i: number, updateLinks: Updater<Link[]>, prevVar: VarConfig}) {
  const onClick = useCallback(() => {
    // TODO: updateF / $spec nonsense
    updateLinks((oldLinks) => {
      let newLinks = oldLinks.slice();
      const newLink: Link = {id: newId(), config: i === 0 ? codeConfigSetTo('') : codeConfigSetTo(prevVar.id)};
      newLinks.splice(i, 0, newLink);
      return newLinks;
    });
  }, [i, prevVar.id, updateLinks]);

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
