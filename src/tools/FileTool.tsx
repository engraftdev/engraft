import { memo, useCallback } from "react";
import Dropzone, { FileRejection } from 'react-dropzone';
import { registerTool, ToolProps, ToolView } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { updateKeys } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";

export interface FileConfig {
  toolName: 'file';
  dataUrl: string | null;
}
export const FileTool = memo(function FileTool({ config, updateConfig, reportOutput, reportView }: ToolProps<FileConfig>) {
  const output = useMemoObject({toolValue: config.dataUrl});
  useOutput(reportOutput, output);

  // TODO: questionable; easier to put this here, but it really belongs in a render component
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      if (typeof reader.result === 'string') {
        updateKeys(updateConfig, {dataUrl: reader.result});
      } else {
        console.error('problem reading file to data url', reader.result, reader.error);
      }
    }, false);
    reader.readAsDataURL(acceptedFiles[0]);  // todo: multiple / 0 files
  }, [updateConfig]);

  const view: ToolView = useCallback(() => (
    <Dropzone onDrop={onDrop}>
      {({getRootProps, getInputProps}) =>
        <div {...getRootProps({className: "root", style: {padding: 10}})}>
          { config.dataUrl ?
            <>{config.dataUrl.length} characters</> :
            <>
              <div>drop here, or click</div>
              <input {...getInputProps({className: "input"})}/>
            </>
          }
          {/* TODO: input; delete */}
        </div>
      }
    </Dropzone>
  ), [config.dataUrl, onDrop]);
  useView(reportView, view);

  return null;
})
registerTool(FileTool, 'file', {
  toolName: 'file',
  dataUrl: null,
});
