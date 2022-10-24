import { memo, useMemo, useState } from "react";
import { ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { startDrag } from "src/util/drag";
import { noOp } from "src/util/noOp";
import { useAt } from "src/util/state";
import { updateF } from "src/util/updateF";
import { SettableValue } from "src/view/SettableValue";
import { slotSetTo } from "../slot";
import { ApparatusIframe } from "./ApparatusIframe";

export type Program = {
  toolName: 'apparatus',
  inputProgram: ToolProgram,
  apparatusProject: string | null,
  width: number,
  height: number,
  viewerSize: [number, number],
  regionOfInterest: RegionOfInterest,
};

export type RegionOfInterest = { x: [number, number], y: [number, number] };

export const programFactory: ProgramFactory<Program> = (defaultInputCode) => ({
  toolName: 'apparatus',
  inputProgram: slotSetTo(defaultInputCode || ''),
  apparatusProject: null,
  width: 600,
  height: 600,
  viewerSize: [200, 200],
  regionOfInterest: {
    x: [-5, 5],
    y: [-5, 5],
  },
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram', varBindings})

  const [apparatusOutput, setApparatusOutput] = useState<unknown>({});

  const outputView = useMemo(() =>
    <ApparatusIframe
      project={program.apparatusProject}
      setProject={noOp}
      input={valueOrUndefined(inputOutput)}
      regionOfInterest={program.regionOfInterest}

      src="http://localhost:8090/?engraft=1&fullScreen=1&viewOnly=1"
      width={program.viewerSize[0]} height={program.viewerSize[1]}
      title="Apparatus viewer"
      style={{ border: 'none' }}

      setOutput={setApparatusOutput}
    />
  , [program.apparatusProject, program.regionOfInterest, program.viewerSize, inputOutput]);

  useOutput(reportOutput, useMemo(() => ({
    value: {
      view: outputView,
      output: apparatusOutput,
    }
  }), [outputView, apparatusOutput]));

  useView(reportView, useMemo(() => ({
    render: (renderProps) => <View
      {...props}
      {...renderProps}
      inputView={inputView}
      inputOutput={inputOutput}
    />
  }), [inputOutput, inputView, props]));

  return <>
    {inputComponent}
  </>;
});

type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  inputView: ToolView | null;
  inputOutput: ToolOutput | null;
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, inputView, inputOutput, autoFocus } = props;

  const [ apparatusProject, , setApparatusProject ] = useAt(program, updateProgram, 'apparatusProject');
  const [ viewerSize, _, setViewerSize ] = useAt(program, updateProgram, 'viewerSize');
  const [ regionOfInterest, , setRegionOfInterest ] = useAt(program, updateProgram, 'regionOfInterest');

  const [ isDragging, setIsDragging ] = useState(false);
  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      setIsDragging(true);
      return {startWidth: program.width, startHeight: program.height};
    },
    move({startWidth, startHeight}) {
      const newWidth = startWidth + this.event.clientX - this.startEvent.clientX;
      const newHeight = startHeight + this.event.clientY - this.startEvent.clientY;
      updateProgram(updateF({ width: {$set: newWidth}, height: {$set: newHeight} }));
    },
    done() {
      setIsDragging(false);
    },
    keepCursor: true,
  }), [program.width, program.height, updateProgram]);

  return <div className="xCol xGap10 xPad10 xWidthFitContent">
    <div className="xRow xGap10 xAlignTop">
      <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
      <span style={{width: 30}} />
      <span style={{fontWeight: 'bold'}}>size</span> <SizeEditor size={viewerSize} setSize={setViewerSize} />
      <span style={{width: 30}} />
      <span style={{fontWeight: 'bold'}}>roi</span> <SettableValue value={regionOfInterest} setValue={setRegionOfInterest} displayRaw/>
    </div>
    <div className="xRow" style={{position: 'relative'}}>
      <ApparatusIframe
        initialProject={apparatusProject}
        setProject={setApparatusProject}
        input={valueOrUndefined(inputOutput)}

        src="http://localhost:8090/?engraft=1"
        width={program.width} height={program.height}
        title="Apparatus editor"
        style={{
          border: 'none', boxShadow: '0px 0px 5px 0px #0008',
          ...isDragging && {pointerEvents: 'none'}
        }}
      />
      <div
        style={{position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize'}}
        onMouseDown={onMouseDownResizer}
      />
    </div>
  </div>
});


type SizeEditorProps = {
  size: [number, number],
  setSize: (size: [number, number]) => void,
};

// TODO: this still ain't great
const SizeEditor = memo((props: SizeEditorProps) => {
  const { size, setSize } = props;
  const [ width, height ] = size;

  const [ isDragging, setIsDragging ] = useState(false);
  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      setIsDragging(true);
      return {startWidth: width, startHeight: height};
    },
    move({startWidth, startHeight}) {
      const newWidth = Math.max(startWidth + this.event.clientX - this.startEvent.clientX, 50);
      const newHeight = Math.max(startHeight + this.event.clientY - this.startEvent.clientY, 50);
      setSize([newWidth, newHeight]);
    },
    done() {
      // HACK: timeout makes the "setIsExpanded(false)" below work
      setTimeout(() => setIsDragging(false), 0);
    },
    keepCursor: true,
  }), [width, height, setSize]);

  const [ isExpanded, setIsExpanded ] = useState(false);

  return <div
    className="xCenter"
    style={{
      position: 'relative', padding: 2, cursor: 'pointer',
      ...!isExpanded && {border: '1px dashed gray'}
    }}
  >
    { !isExpanded &&
      <div onClick={() => setIsExpanded(true)}>{width} x {height}</div>
    }
    { isExpanded &&
      <div
        className="xCenter"
        style={{position: 'absolute', border: '1px dashed gray', top: 0, left: 0, width, height, backgroundColor: 'white', zIndex: 100, cursor: 'pointer'}}
        onClick={() => { if (!isDragging) { setIsExpanded(false) }}}
      >
        <input
          type='number'
          value={width} onChange={(e) => setSize([parseInt(e.target.value), height])}
          onClick={(e) => {console.log('stopping'); e.stopPropagation()}}
          style={{width: 50, zIndex: 101}}
        />
        {' x '}
        <input
          type='number'
          value={height} onChange={(e) => setSize([width, parseInt(e.target.value)])}
          onClick={(e) => e.stopPropagation()}
          style={{width: 50, zIndex: 101}}
        />
        <div style={{position: 'absolute', top: 0, left: 0, width: width + 100, height: height + 100, zIndex: 99}}>
        </div>
        <div
          style={{position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize', zIndex: 101}}
          onMouseDown={onMouseDownResizer} onClick={e => e.stopPropagation()}
        />
      </div>
    }
  </div>;
});
