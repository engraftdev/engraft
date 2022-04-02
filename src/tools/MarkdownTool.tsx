import { memo, useCallback, useMemo } from "react";
import { registerTool, ToolConfig, toolIndex, ToolProps } from "../tools-framework/tools";

import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import MarkdownIt from 'markdown-it';
import { codeConfigSetTo } from "./CodeTool";
import { useMemoObject } from "../util/useMemoObject";

export interface MarkdownConfig {
  toolName: 'markdown';
  sourceConfig: ToolConfig;
}

export const MarkdownTool = memo(function MarkdownTool({config, updateConfig, reportView, reportOutput}: ToolProps<MarkdownConfig>) {
  const [sourceComponent, sourceView, sourceOutput] = useSubTool({config, updateConfig, subKey: 'sourceConfig'})

  const md = useMemo(() => new MarkdownIt({html: true, linkify: true}), [])

  const sourceOutputWithAlreadyDisplayed = useMemoObject({toolValue: sourceOutput?.toolValue, alreadyDisplayed: true});
  useOutput(reportOutput, sourceOutputWithAlreadyDisplayed);

  const htmlOrError = useMemo(() => {
    if (!sourceOutput) {
      return {error: 'missing source'};
    }
    if (typeof(sourceOutput.toolValue) !== 'string') {
      return {error: 'source is not string'};
    }
    return {html: md.render(sourceOutput.toolValue)}
  }, [md, sourceOutput])

  const render = useCallback(function R() {
    return <div style={{display: 'flex', gap: 20, alignItems: 'flex-start', padding: 10}}>
      <div style={{flexShrink: 0}}>
        <ShowView view={sourceView} />
      </div>
      <div>
        {htmlOrError.html ?
          <div dangerouslySetInnerHTML={{__html: htmlOrError.html}} /> :
          <span style={{color: 'red'}}>{htmlOrError.error}</span>
        }
      </div>
    </div>;
  }, [htmlOrError.error, htmlOrError.html, sourceView]);
  useView(reportView, render, config);

  return sourceComponent;
})
registerTool<MarkdownConfig>(MarkdownTool, () => ({
  toolName: 'markdown',
  sourceConfig: codeConfigSetTo(toolIndex['text'].defaultConfig()),
}));
