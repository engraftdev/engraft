import { ComputeReferences, EngraftPromise, ProgramFactory, ToolOutput, ToolProps, ToolRun, ToolView, ToolViewRenderProps } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { memo, useCallback, useMemo } from "react";
import * as DropzoneModule from "react-dropzone";
import {FileRejection } from "react-dropzone";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { assertNever } from "@engraft/shared/lib/assert.js";
import * as d3dsv from "d3-dsv";

// TODO: what hath ESM wrought?
const Dropzone = DropzoneModule.default as unknown as typeof import("react-dropzone").default;

export type P = {
  toolName: 'file';
  file: null | {
    dataURL: string,
    size: number,
    outputMode: OutputMode,
  }
}

type OutputMode = 'text' | 'data-uri' | 'react-image' | 'json' | 'csv';

export const computeReferences: ComputeReferences<P> = (program) => new Set();

export const programFactory: ProgramFactory<P> = () => ({
  toolName: 'file',
  file: null,
});

export const run: ToolRun<P> = memoizeProps(hooks((props: ToolProps<P>) => {
  const { program } = props;

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => EngraftPromise.try(() => {
    if (!program.file) { return EngraftPromise.unresolved(); }

    switch (program.file.outputMode) {
      case 'text':
        return { value: textFromDataURL(program.file.dataURL) };
      case 'data-uri':
        return { value: program.file.dataURL };
      case 'react-image':
        // eslint-disable-next-line jsx-a11y/alt-text
        return { value: <img src={program.file.dataURL} /> };
      case 'json':
        return { value: JSON.parse(textFromDataURL(program.file.dataURL)) };
      case 'csv':
        return { value: d3dsv.csvParse(textFromDataURL(program.file.dataURL), d3dsv.autoType) };
      default:
        assertNever(program.file.outputMode, `Unknown output mode: ${program.file.outputMode}`);
    }
  }), [program.file]);

  const view: ToolView<P> = hookMemo(() => ({
    render: (renderProps) => <View {...props} {...renderProps} />,
  }), [props]);

  return { outputP, view };
}));

const View = memo((props: ToolProps<P> & ToolViewRenderProps<P>) => {
  const { program, updateProgram } = props;
  const programUP = useUpdateProxy(updateProgram);

  const mimeType = useMemo(() => {
    if (!program.file) { return null; }
    return mimeTypeFromDataURL(program.file.dataURL);
  }, [program.file]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      if (typeof reader.result === 'string') {
        const dataURL = reader.result;
        const mimeType = mimeTypeFromDataURL(dataURL);
        const outputMode = defaultOutputModeForMimeType(mimeType);
        programUP.file.$set({
          dataURL,
          outputMode,
          size: acceptedFiles[0].size,
        });
      } else {
        console.error('problem reading file to data url', reader.result, reader.error);
      }
    }, false);
    reader.readAsDataURL(acceptedFiles[0]);  // todo: multiple / 0 files
  }, [programUP.file]);

  return <div style={{padding: 5, fontSize: 12}}>
    { program.file
      ? <>
          {mimeType}, {humanFileSize(program.file.size)}
          {' as '}
          <select
            value={program.file.outputMode}
            onChange={(ev) => programUP.file.outputMode.$set(ev.target.value as any)}
          >
            <option value="text">text</option>
            <option value="json">json</option>
            <option value="csv">csv</option>
            <option value="data-uri">data URL</option>
            <option value="react-image">React image</option>
          </select>
          {' '}
          <button
            onClick={() => programUP.file.$set(null)}
            style={{all: 'unset', cursor: 'pointer'}}
          >
            🚮
          </button>
        </>
      : <Dropzone onDrop={onDrop}>
          {({getRootProps}) =>
            <div {...getRootProps({style: {fontStyle: 'italic', cursor: 'pointer'}})}>drop here, or click</div>
          }
        </Dropzone>
    }
  </div>
});

// From https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
function humanFileSize(bytes: number, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

function mimeTypeFromDataURL(dataURL: string) {
  return dataURL.split(';')[0].split(':')[1];
}

function textFromDataURL(dataURL: string) {
  return window.atob(dataURL.split(',')[1]);
}

function defaultOutputModeForMimeType(mimeType: string): OutputMode {
  if (mimeType === 'application/json') {
    return 'json';
  } else if (mimeType === 'text/csv') {
    return 'csv';
  } else if (mimeType.startsWith('text/')) {
    return 'text';
  } else if (mimeType.startsWith('image/')) {
    return 'react-image';
  } else {
    return 'data-uri';
  }
}
