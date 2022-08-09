import { memo, useCallback, useMemo } from "react";
import Dropzone, { FileRejection } from 'react-dropzone';
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { updateKeys } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";

export interface Program {
  toolName: 'file';
  dataUrl: string | null;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'file',
  dataUrl: null,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  useOutput(reportOutput, useMemoObject({
    value: program.dataUrl
  }));

  // TODO: questionable; easier to put this here, but it really belongs in a render component
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      if (typeof reader.result === 'string') {
        updateKeys(updateProgram, {dataUrl: reader.result});
      } else {
        console.error('problem reading file to data url', reader.result, reader.error);
      }
    }, false);
    reader.readAsDataURL(acceptedFiles[0]);  // todo: multiple / 0 files
  }, [updateProgram]);

  useView(reportView, useMemo(() => ({
    render: () =>
      <Dropzone onDrop={onDrop}>
        {({getRootProps, getInputProps}) =>
          <div {...getRootProps({className: "root", style: {padding: 10}})}>
            { program.dataUrl ?
              <>{program.dataUrl.length} characters</> :
              <>
                <div>drop here, or click</div>
                <input {...getInputProps({className: "input"})}/>
              </>
            }
            {/* TODO: input; delete */}
          </div>
        }
      </Dropzone>
  }), [onDrop, program.dataUrl]));

  return null;
});
