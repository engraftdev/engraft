import { memo, useCallback, useMemo } from "react";
import { registerTool, ToolProgram, ToolProps, ToolView, lookUpTool } from "src/tools-framework/tools";

import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import MarkdownIt from 'markdown-it';
import { codeProgramSetTo } from "./CodeTool";
import { useMemoObject } from "src/util/useMemoObject";

export interface MarkdownProgram {
  toolName: 'markdown';
  sourceProgram: ToolProgram;
}

export const MarkdownTool = memo(function MarkdownTool({program, updateProgram, reportView, reportOutput}: ToolProps<MarkdownProgram>) {
  const [sourceComponent, sourceView, sourceOutput] = useSubTool({program, updateProgram, subKey: 'sourceProgram'})

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

  const view: ToolView = useCallback(() => (
    <div className="xCol" style={{gap: 20, padding: 10}}>
      {/* <div style={{flexShrink: 0}}> */}
      <div>
        <ShowView view={sourceView} />
      </div>
      <div>
        {htmlOrError.html ?
          <div dangerouslySetInnerHTML={{__html: htmlOrError.html}} /> :
          <span style={{color: 'red'}}>{htmlOrError.error}</span>
        }
      </div>
    </div>
  ), [htmlOrError.error, htmlOrError.html, sourceView]);
  useView(reportView, view);

  return sourceComponent;
})
registerTool<MarkdownProgram>(MarkdownTool, 'markdown', () => ({
  toolName: 'markdown',
  sourceProgram: codeProgramSetTo(lookUpTool('text').defaultProgram()),
}));
