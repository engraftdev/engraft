import MarkdownIt from 'markdown-it';
import { memo, useCallback, useMemo } from "react";
import { ProgramFactory, ToolProgram, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useMemoObject } from "src/util/useMemoObject";
import { codeProgramSetTo } from "./code";
import { programFactory as textProgramFactory } from "./text";

export type Program = {
  toolName: 'markdown',
  sourceProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'markdown',
  // TODO: idk if I like this "textProgramFactory" import
  sourceProgram: codeProgramSetTo(textProgramFactory()),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

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
});
