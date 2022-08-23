import MarkdownIt from 'markdown-it';
import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useMemoObject } from "src/util/useMemoObject";
import { slotSetTo } from "./slot";
import { programFactory as textProgramFactory } from "./text";

export type Program = {
  toolName: 'markdown',
  sourceProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'markdown',
  // TODO: idk if I like this "textProgramFactory" import
  sourceProgram: slotSetTo(textProgramFactory()),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [sourceComponent, sourceView, sourceOutput] = useSubTool({program, updateProgram, subKey: 'sourceProgram'})

  const md = useMemo(() => new MarkdownIt({html: true, linkify: true}), [])

  useOutput(reportOutput, useMemoObject({
    value: valueOrUndefined(sourceOutput),
    alreadyDisplayed: true
  }));

  const htmlOrError = useMemo(() => {
    if (!hasValue(sourceOutput)) {
      return {error: 'missing source'};
    }
    if (typeof(sourceOutput.value) !== 'string') {
      return {error: 'source is not string'};
    }
    return {html: md.render(sourceOutput.value)}
  }, [md, sourceOutput])

  useView(reportView, useMemo(() => ({
    render: () =>
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
  }), [htmlOrError.error, htmlOrError.html, sourceView]));

  return sourceComponent;
});
