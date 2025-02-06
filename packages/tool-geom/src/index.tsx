import { EngraftContext, ToolWithView, renderWithReact, up } from "@engraft/hostkit";
import { OrError } from "@engraft/shared/lib/OrError.js";
import { assert } from "@engraft/shared/lib/assert.js";
import { startDrag } from "@engraft/shared/lib/drag.js";
import { Matrix, Point } from "@engraft/shared/lib/geom.js";
import { isObject } from "@engraft/shared/lib/isObject.js";
import { empty, noOp } from "@engraft/shared/lib/noOp.js";
import { useHover } from "@engraft/shared/lib/useHover.js";
import { useRefForCallback } from "@engraft/shared/lib/useRefForCallback.js";
import { CollectReferences, EngraftPromise, ErrorView, InputHeading, MakeProgram, RefuncMemory, ShowView, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, UpdateProxy, VarBinding, VarBindings, defineTool, hookMemo, hookRunTool, hooks, inputFrameBarBackdrop, memoizeProps, randomId, runTool, usePromiseState } from "@engraft/toolkit";
import { ComponentProps, Fragment, MutableRefObject, ReactNode, createContext, memo, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";


export type Program = {
  toolName: 'geom',
  inputProgram: ToolProgram,
  statePreparation: Record<string, 'point' | 'vector'>,
  script: Script,
}

const makeProgram: MakeProgram<Program> = (context, defaultInputCode) => ({
  toolName: 'geom',
  inputProgram: context.makeSlotWithCode(defaultInputCode),
  statePreparation: {},
  script: {
    id: randomId(),
    commands: [],
  },
});

const collectReferences: CollectReferences<Program> = (program) => [ program.inputProgram ];

const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;

  const inputResult = hookRunTool({program: program.inputProgram, varBindings, context});

  const initialStateP = hookMemo(() => inputResult.outputP.then(({value: inputOutput}) => {
    if (!isObject(inputOutput)) { throw new Error('input must be an object'); }
    let initialState: State = {};
    for (const [name, value] of Object.entries(program.statePreparation)) {
      const inInput = (inputOutput as any)[name];
      if (inInput === undefined) { continue; }
      if (value === 'point') {
        initialState[name] = {type: 'point', x: inInput.x, y: inInput.y};
      } else if (value === 'vector') {
        initialState[name] = {type: 'vector', x: 3, y: 3, vx: inInput.x, vy: inInput.y};
      } else {
        throw new Error(`unknown statePreparation type: ${value}`);
      }
    }
    return initialState;
  }), [inputResult.outputP, program.statePreparation]);

  const traceAndFinalStateP = hookMemo(() => initialStateP.then((initialState) => {
    const trace: Trace = Trace.create();
    let finalState: OrError<State> = OrError.try(() =>
      performScript(program.script, initialState, trace, context)
    );
    return {trace, finalState};
  }), [context, initialStateP, program.script]);

  const traceP = hookMemo(() => (
    traceAndFinalStateP.then(({trace}) => trace)
  ), [traceAndFinalStateP]);
  const finalStateP = hookMemo(() => (
    traceAndFinalStateP.then(({finalState}) => OrError.orThrow(finalState))
  ), [traceAndFinalStateP]);

  const outputP = hookMemo(() => finalStateP.then((finalState) => {
    let output = {} as Record<string, unknown>;
    for (const [name, value] of Object.entries(finalState)) {
      if (value.type === 'point') {
        output[name] = {x: value.x, y: value.y};
      } else if (value.type === 'vector') {
        output[name] = {x: value.vx, y: value.vy};
      } else {
        throw new Error(`unknown state type`);
      }
    }
    return {value: output};
  }), [finalStateP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((renderProps) => <View
      {...props} {...renderProps}
      inputResult={inputResult}
      traceP={traceP}
    />),
  }), [inputResult, props, traceP]);

  return {outputP, view};
}));

export default defineTool<Program>({ name: 'geom', makeProgram, collectReferences, run })

type Pos = {
  commandsUP: UpdateProxy<Command[]>,
  scriptId: string,
} & (
  | { type: 'between-commands', indexBetween: number }
  | { type: 'during-command', indexDuring: number }
)

function insertAtPos(pos: Pos & { type: 'between-commands' }, command: Command) {
  pos.commandsUP.$helper({$splice: [[pos.indexBetween, 0, command]]});
}

function posCommandUP(pos: Pos & { type: 'during-command' }) {
  return pos.commandsUP[pos.indexDuring];
}

function eqPos(a: Pos, b: Pos) {
  if (a.type === 'between-commands' && b.type === 'between-commands') {
    return a.indexBetween === b.indexBetween && a.scriptId === b.scriptId;
  } else if (a.type === 'during-command' && b.type === 'during-command') {
    return a.indexDuring === b.indexDuring && a.scriptId === b.scriptId;
  } else {
    return false;
  }
}

type ViewState = {
  selectedPos: Pos,
  hoveredPos: Pos | undefined,
}

const Context = createContext({
  maybeTrace: undefined as Trace | undefined,
  viewState: undefined as any as ViewState,
  viewStateUP: undefined as any as UpdateProxy<ViewState>,
})

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult
  traceP: EngraftPromise<Trace>,
}) => {
  const { program, updateProgram, autoFocus, inputResult, traceP, context, frameBarBackdropElem } = props;
  const programUP = up(updateProgram);

  const inputOutputState = usePromiseState(inputResult.outputP);
  const traceState = usePromiseState(traceP);

  const maybeTrace = traceState.status === 'fulfilled' ? traceState.value : undefined;

  const [viewState, setViewState] = useState<ViewState>(() => ({
    selectedPos: {
      commandsUP: programUP.script.commands,
      scriptId: program.script.id,
      type: 'between-commands',
      indexBetween: program.script.commands.length,
    },
    hoveredPos: undefined,
  }));
  const viewStateUP = up(setViewState);

  return <Context.Provider value={{maybeTrace, viewState, viewStateUP}}>
    {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
    <InputHeading
      slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$apply} autoFocus={autoFocus} />}
    />
    <div className="xPad10 xCol xGap10">
      { traceState.status === 'rejected'
        ? <ErrorView error={traceState.reason} />
        : traceState.status === 'pending'
        ? <div>...</div>
        : <ViewWithInput
            {...props}
            inputValue={(inputOutputState as any).value.value}
            trace={traceState.value}
          />
      }
      <div className="xCol">
        <ScriptView script={program.script} scriptUP={programUP.script} context={context}/>
      </div>
      <button
        disabled={viewState.selectedPos.type !== 'between-commands'}
        onClick={() => {
          assert(viewState.selectedPos.type === 'between-commands');
          insertAtPos(viewState.selectedPos, {
            id: randomId(),
            type: 'if',
            condition: context.makeSlotWithCode('true'),
            then: {
              id: randomId(),
              commands: [],
            },
          });
        }}
      >
        insert if
      </button>
      <button
        onClick={() => {
          // TODO: replace this button with per-command deletion
          viewState.selectedPos.commandsUP.$set([]);
          viewStateUP.selectedPos.$set({
            commandsUP: programUP.script.commands,
            scriptId: program.script.id,
            type: 'between-commands',
            indexBetween: 0
          });
        }}
      >
        clear commands
      </button>
    </div>
  </Context.Provider>;
});

function viewedState(viewState: ViewState, trace: Trace): State {
  const pos = viewState.hoveredPos || viewState.selectedPos;
  if (pos.type === 'between-commands') {
    return Trace.get(trace, pos.scriptId, pos.indexBetween)!;
  } else {
    return (
      Trace.get(trace, pos.scriptId, pos.indexDuring + 1)
      || Trace.get(trace, pos.scriptId, pos.indexDuring)!
    );
  }
}

function commandDragInit(viewStateRef: MutableRefObject<ViewState>, viewStateUP: UpdateProxy<ViewState>, command: Command): void {
  const viewState = viewStateRef.current;
  assert(viewState.selectedPos.type === 'between-commands');
  insertAtPos(viewState.selectedPos, command);
  viewStateUP.selectedPos.$set({
    ...viewState.selectedPos,
    type: 'during-command',
    indexDuring: viewState.selectedPos.indexBetween,
  });
};

function commandDragMove(viewStateRef: MutableRefObject<ViewState>): UpdateProxy<Command> {
  const viewState = viewStateRef.current;
  assert(viewState.selectedPos.type === 'during-command');
  return posCommandUP(viewState.selectedPos);
}

function commandDragDone(viewStateRef: MutableRefObject<ViewState>, viewStateUP: UpdateProxy<ViewState>, traceRef: MutableRefObject<Trace>) {
  const viewState = viewStateRef.current;
  assert(viewState.selectedPos.type === 'during-command');
  const finalState = viewedState(viewStateRef.current, traceRef.current);
  const commandUP = posCommandUP(viewState.selectedPos);

  viewStateUP.selectedPos.$set({
    ...viewState.selectedPos,
    type: 'between-commands',
    indexBetween: viewState.selectedPos.indexDuring + 1,
  });

  return { finalState, commandUP };
}

const ViewWithInput = memo((props: ComponentProps<typeof View> & {
  inputValue: object,
  trace: Trace,
}) => {
  const { program, updateProgram, inputValue, trace, context } = props;
  const programUP = up(updateProgram);
  const traceRef = useRefForCallback(trace);

  const { viewState, viewStateUP } = useContext(Context);
  const viewStateRef = useRefForCallback(viewState);

  const finalState = viewedState(viewState, trace);

  if (!finalState) {
    return <div>no final state</div>;
  }

  const svgBitsFromEntities: ReactNode[] = [];
  const htmlBitsFromEntities: ReactNode[] = [];
  Object.entries(finalState).forEach(([name, shape]) => {
    if (shape.type === 'point') {
      const onMouseDownPoint = startDrag({
        init() {
          commandDragInit(viewStateRef, viewStateUP, {
            id: randomId(),
            type: 'translate-point',
            name,
            move: { type: 'literal', x: 0, y: 0 }
          });
        },
        move() {
          commandDragMove(viewStateRef)
            .move.$set({ type: 'literal', x: this.startDeltaX / 20, y: this.startDeltaY / 20 });
        },
        done() {
          const { finalState, commandUP } = commandDragDone(viewStateRef, viewStateUP, traceRef);
          const magnetsAndPositions = magnetsAndPositionsFromState(finalState);
          const shape = finalState[name];
          for (const {magnet, position} of magnetsAndPositions) {
            if (magnet.name === name) { continue; }
            if (Math.abs(position.x - shape.x) < 0.5 && Math.abs(position.y - shape.y) < 0.5) {
              commandUP.move.$set({ type: 'magnet', magnet });
              break;
            }
          }
        },
        cursor: "grabbing",
      });

      svgBitsFromEntities.push(<Fragment key={name}>
        <line
          x1={shape.x} y1={shape.y}
          x2={-1} y2={shape.y}
          stroke="rgba(0, 0, 0, 0.3)" strokeWidth="0.1" strokeDasharray="0.2 0.2"
        />
        <circle
          key={name}
          cx={shape.x} cy={shape.y}
          r="0.5" stroke="black" fill="none" strokeWidth="0.1"
          onMouseDown={onMouseDownPoint as any}
          style={{cursor: "grabbing"}}
        />
      </Fragment>);

      htmlBitsFromEntities.push(<Fragment key={name}>
        <div style={{
          position: 'absolute', left: (-1) * 20 + 100, top: shape.y * 20 + 50,
          transform: 'translate(-100%, -50%)',

        }}>
          <div>{name}</div>
        </div>
      </Fragment>);
    } else if (shape.type === 'vector') {
      const vectorPoint: Point = [shape.vx, shape.vy];
      const vectorNorm = Point.mul(vectorPoint, 1 / Point.len(vectorPoint));
      const vectorNormRotated1 = Matrix.rotate(Math.PI * 0.9).fromLocal(vectorNorm);
      const vectorNormRotated2 = Matrix.rotate(-Math.PI * 0.9).fromLocal(vectorNorm);

      const onMouseDownTail = startDrag({
        init() {
          commandDragInit(viewStateRef, viewStateUP, {
            id: randomId(),
            type: 'translate-vector',
            name,
            move: { type: 'literal', x: 0, y: 0 }
          });
        },
        move() {
          commandDragMove(viewStateRef)
            .move.$set({ type: 'literal', x: this.startDeltaX / 20, y: this.startDeltaY / 20 });
        },
        done() {
          const { finalState, commandUP } = commandDragDone(viewStateRef, viewStateUP, traceRef);
          const magnetsAndPositions = magnetsAndPositionsFromState(finalState);
          const shape = finalState[name] as Shape & {type: 'vector'};
          const tail = {x: shape.x, y: shape.y};
          const head = {x: shape.x + shape.vx, y: shape.y + shape.vy};
          for (const {magnet, position} of magnetsAndPositions) {
            if (magnet.name === name) { continue; }
            if (Math.abs(position.x - head.x) < 0.5 && Math.abs(position.y - head.y) < 0.5) {
              commandUP.move.$set({ type: 'magnet', magnet, end: 'head' });
              break;
            }
            if (Math.abs(position.x - tail.x) < 0.5 && Math.abs(position.y - tail.y) < 0.5) {
              commandUP.move.$set({ type: 'magnet', magnet, end: 'tail' });
              break;
            }
          }
        },
        cursor: "grabbing",
      });

      const onMouseDownHead = startDrag({
        init() {
          commandDragInit(viewStateRef, viewStateUP, {
            id: randomId(),
            type: 'scale-vector',
            name,
            factor: context.makeSlotWithCode('[1, 1]'),
          });
        },
        move() {
          const xFactor = (shape.vx + this.startDeltaX / 20) / shape.vx;
          const yFactor = (shape.vy + this.startDeltaY / 20) / shape.vy;
          commandDragMove(viewStateRef)
            .factor.$set(context.makeSlotWithCode(`[${xFactor.toFixed(2)}, ${yFactor.toFixed(2)}]`));
        },
        done() {
          const { finalState, commandUP } = commandDragDone(viewStateRef, viewStateUP, traceRef);
          const magnetsAndPositions = magnetsAndPositionsFromState(finalState);
          const finalShape = finalState[name] as Shape & {type: 'vector'};
          const finalTail = {x: finalShape.x, y: finalShape.y};
          const finalHead = {x: finalShape.x + finalShape.vx, y: finalShape.y + finalShape.vy};
          for (const {magnet, position} of magnetsAndPositions) {
            if (magnet.name === name) { continue; }
            if (Math.abs(position.x - finalHead.x) < 0.5 && Math.abs(position.y - finalHead.y) < 0.5) {
              commandUP.move.$set({ type: 'magnet', magnet, end: 'head' });
              break;
            }
            if (Math.abs(position.x - finalTail.x) < 0.5 && Math.abs(position.y - finalTail.y) < 0.5) {
              commandUP.move.$set({ type: 'magnet', magnet, end: 'tail' });
              break;
            }
          }
        },
        cursor: "grabbing",
      });

      svgBitsFromEntities.push(<Fragment key={name}>
        <line
          x1={shape.x + shape.vx / 2} y1={shape.y + shape.vy / 2}
          x2={-1} y2={shape.y + shape.vy / 2}
          stroke="rgba(0, 0, 0, 0.3)" strokeWidth="0.1" strokeDasharray="0.2 0.2"
        />
        <line
          x1={shape.x} y1={shape.y}
          x2={shape.vx + shape.x} y2={shape.vy + shape.y}
          stroke="black" strokeWidth="0.1"
        />
        <polygon
          points={`${shape.vx + shape.x + vectorNormRotated1[0]},${shape.vy + shape.y + vectorNormRotated1[1]} ${shape.vx + shape.x + vectorNormRotated2[0]},${shape.vy + shape.y + vectorNormRotated2[1]} ${shape.vx + shape.x},${shape.vy + shape.y}`}
          fill="black"
          onMouseDown={onMouseDownHead as any}
          style={{cursor: "grabbing"}}
        />
        <circle
          cx={shape.x} cy={shape.y}
          r="0.2" fill="black"
          onMouseDown={onMouseDownTail as any}
          style={{cursor: "grabbing"}}
        />
      </Fragment>);

      htmlBitsFromEntities.push(<Fragment key={name}>
        <div style={{
          position: 'absolute', left: (-1) * 20 + 100, top: (shape.y + shape.vy / 2) * 20 + 50,
          transform: 'translate(-100%, -50%)',

        }}>
          <div>{name}</div>
        </div>
      </Fragment>);
    } else {
      throw new Error(`weird entity: ${shape}`)
    }
  });

  return <div>
    { Object.entries(inputValue).map(([name, value]) => {
      return <div key={name} className="xRow xGap10">
        {name}
        {/* select what it should be in statepreparation */}
        <select
          value={program.statePreparation[name] || 'nothing'}
          onChange={(e) => {
            const value = e.target.value as 'nothing' | 'point' | 'vector';
            if (value === 'nothing') {
              programUP.statePreparation[name].$remove();
            } else {
              programUP.statePreparation[name].$set(value);
            }
          }}
        >
          <option value="nothing">nothing</option>
          <option value="point">point</option>
          <option value="vector">vector</option>
        </select>
      </div>
    })}
    <div style={{position: 'relative'}}>
      <svg width="400" height="300" viewBox="-5 -2.5 20 15">
        <rect x="0" y="0" width="10" height="10" fill="none" stroke="black" strokeWidth="0.1"/>
        {svgBitsFromEntities}
      </svg>
      {htmlBitsFromEntities}
    </div>
  </div>
});

function CommandView (props: {
  command: Command,
  commandUP: UpdateProxy<Command>,
  scriptId: string,
  index: number,
  context: EngraftContext,
}) {
  const {command, commandUP, scriptId, index, context} = props;
  const {maybeTrace, viewState} = useContext(Context);

  const maybeStateBefore = maybeTrace ? Trace.get(maybeTrace, scriptId, index) : undefined;

  const isDuring = viewState.selectedPos.type === 'during-command' &&
    viewState.selectedPos.commandsUP[viewState.selectedPos.indexDuring] === commandUP;

  const style = {
    ...isDuring && {
      backgroundColor: 'hsl(210, 100%, 90%)',
    }
  }

  if (command.type === 'if') {
    const varBindings = maybeStateBefore ? varBindingsFromState(maybeStateBefore) : {};
    // console.log("if is getting varBindings", varBindings);
    return <div style={style}>
      if {' '}
      <div style={{display: "inline-block"}}>
        {/* TODO: varbindings */}
        <ToolWithView
          program={command.condition} updateProgram={commandUP.$as(command).condition.$}
          varBindings={varBindings}
          reportOutputState={noOp}
          context={context}
        />
      </div>
      {' '} then
      <div style={{paddingLeft: 20, borderLeft: '1px solid hsl(0, 0%, 90%)'}}>
        <ScriptView script={command.then} scriptUP={commandUP.$as(command).then} context={context}/>
      </div>
    </div>;
  } else if (command.type === 'translate-vector') {
    if (command.move.type === 'literal') {
      return <div style={style}>
        translate <b>{command.name}</b> by ({command.move.x.toFixed(2)}, {command.move.y.toFixed(2)})
      </div>;
    } else {
      return <div style={style}>
        translate <b>{command.name}</b>'s {command.move.end} onto {describeMagnet(command.move.magnet)}
      </div>;
    }
  } else if (command.type === 'translate-point') {
    if (command.move.type === 'literal') {
      return <div style={style}>
        translate <b>{command.name}</b> by ({command.move.x.toFixed(2)}, {command.move.y.toFixed(2)})
      </div>;
    } else {
      return <div style={style}>
        translate <b>{command.name}</b> onto {describeMagnet(command.move.magnet)}
      </div>;
    }
  } else if (command.type === 'scale-vector') {
    return <div style={style}>
      scale <b>{command.name}</b> by {' '}
      <div style={{display: "inline-block"}}>
        <ToolWithView
          program={command.factor} updateProgram={commandUP.$as(command).factor.$}
          varBindings={empty}
          reportOutputState={noOp}
          context={context}
        />
      </div>
      {/* {describeToolProgram(command.factor)} */}
    </div>;
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

function ScriptView (props: {
  script: Script,
  scriptUP: UpdateProxy<Script>,
  context: EngraftContext
}) {
  const {script, scriptUP, context} = props;

  return <>
    {script.commands.map((command, i) => <Fragment key={command.id}>
      <CursorView commandsUP={scriptUP.commands} scriptId={script.id} index={i} />
      <CommandView key={command.id} command={command} commandUP={scriptUP.commands[i]} scriptId={script.id} index={i} context={context}/>
    </Fragment>)}
    <CursorView commandsUP={scriptUP.commands} scriptId={script.id} index={script.commands.length} />
  </>;
}

function CursorView (props: {
  commandsUP: UpdateProxy<Command[]>,
  scriptId: string,
  index: number,
}) {
  // TODO: don't allow any form of selection if the cursor is not reached in execution

  const {commandsUP, scriptId, index} = props;
  const pos: Pos = useMemo(() => (
    {commandsUP, scriptId, type: 'between-commands', indexBetween: index}
  ), [commandsUP, scriptId, index]);

  const {viewState, viewStateUP} = useContext(Context);
  const isSelected = eqPos(viewState.selectedPos, pos);

  const [hoverRef, isHovered] = useHover();

  useEffect(() => {
    if (isHovered) {
      viewStateUP.hoveredPos.$set(pos);
    } else if (viewState.hoveredPos === pos) {
      viewStateUP.hoveredPos.$set(undefined);
    }
  }, [isHovered, pos, viewState.hoveredPos, viewStateUP.hoveredPos]);

  const color = isSelected ? "blue" : isHovered ? "black" : "transparent";

  return (
    <div
      ref={hoverRef}
      className="xCol xAlignVCenter xClickable"
      style={{
        height: 10
      }}
      onClick={() => {
        viewStateUP.selectedPos.$set(pos);
      }}
    >
    <div className="xCenter"
      style={{
        borderTop: `1px solid ${color}`,
        height: 0
      }}
    />
    </div>
  );
}



/*

1. Move velocity so its base is on position.
2. Move position so it is on the tip of velocity.
3. If position.x < 0 or position.x > width:
  3.1. Scale velocity by [-1, 1].
4. If position.y < 0 or position.y > height:
  4.1. Scale velocity by [1, -1].

[Those scales could be x/y scales]

What's the UI

1. Drag the shaft of the vector until there's a magnetic snap.
2. Drag the dot until there's a magnetic snap.
3. Add an "IF", then edit condition
  3.1 Hold "s", drag the tip, then edit scale factor
4. [repeat]

What's the rep (NO GENERALIZATION ALLOWED BUDDY)

1. TRANSLATE_VECTOR(id, 'tail', [point's magnet id])
2. TRANSLATE_POINT(id, [vector head magnet id])
3. IF([condition], SCALE_VECTOR(v))

*/

type Magnet =
  | {
      type: 'point',
      name: string,
    }
  | {
      type: 'vector',
      name: string,
      end: 'head' | 'tail',
    };

function describeMagnet (magnet: Magnet): ReactNode {
  if (magnet.type === 'point') {
    return <b>{magnet.name}</b>;
  } else {
    return <><b>{magnet.name}</b>'s <b>{magnet.end}</b></>;
  }
}

type Script = {
  id: string,
  commands: Command[],
}

type Command = { id: string } & (
  | {
      type: 'if',
      condition: ToolProgram,
      then: Script,
    }
  | {
      type: 'translate-vector',
      name: string,
      move:
        | {
            type: 'literal',
            x: number,
            y: number,
          }
        | {
            type: 'magnet',
            end: 'head' | 'tail',
            magnet: Magnet,
          }
    }
  | {
      type: 'translate-point',
      name: string,
      move:
        | {
            type: 'literal',
            x: number,
            y: number,
          }
        | {
            type: 'magnet',
            magnet: Magnet,
          }
    }
  | {
      type: 'scale-vector',
      name: string,
      factor: ToolProgram,
    }
);

type Shape =
  | {
      type: 'point',
      x: number,
      y: number,
    }
  | {
      type: 'vector',
      x: number,
      y: number,
      vx: number,
      vy: number,
    };

type State = Record<string, Shape>;

type MagnetAndPosition = {magnet: Magnet, position: {x: number, y: number}};

function magnetsAndPositionsFromShape (shape: Shape, name: string): MagnetAndPosition[] {
  if (shape.type === 'point') {
    return [
      {
        magnet: {type: 'point', name},
        position: {x: shape.x, y: shape.y},
      }
    ];
  } else {
    return [
      {
        magnet: {type: 'vector', name, end: 'tail'},
        position: {x: shape.x, y: shape.y},
      },
      {
        magnet: {type: 'vector', name, end: 'head'},
        position: {x: shape.x + shape.vx, y: shape.y + shape.vy},
      },
    ];
  }
}

function magnetsAndPositionsFromState (state: State): MagnetAndPosition[] {
  return Object.entries(state).flatMap(([name, value]) => magnetsAndPositionsFromShape(value, name));
}

function resolveMagnet (magnet: Magnet, state: State): {x: number, y: number} {
  if (magnet.type === 'point') {
    const point = state[magnet.name];
    if (point.type !== 'point') { throw new Error(`Expected ${describeMagnet(magnet)} to be a point`); }
    return {x: point.x, y: point.y};
  } else {
    const vector = state[magnet.name];
    if (vector.type !== 'vector') { throw new Error(`Expected ${describeMagnet(magnet)} to be a vector`); }
    if (magnet.end === 'head') {
      return {x: vector.x + vector.vx, y: vector.y + vector.vy};
    } else {
      return {x: vector.x, y: vector.y};
    }
  }
}

function makeVarBinding (name: string, value: unknown): VarBinding {
  return {var_: {id: `ID${name}000000`, label: name}, outputP: EngraftPromise.resolve({value})};
}

function varBindingsFromState (state: State): VarBindings {
  let result: VarBindings = {};
  for (const name in state) {
    const object = state[name];
    const varBinding = makeVarBinding(name, object);
    result[varBinding.var_.id] = varBinding;
  }
  return result;
}

type Trace = {
  _states: Record<string, State>,
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Trace = {
  create(): Trace {
    return {_states: {}};
  },
  set(trace: Trace, scriptId: string, index: number, state: State): void {
    trace._states[`${scriptId}:${index}`] = state;
  },
  get(trace: Trace, scriptId: string, index: number): State | undefined {
    return trace._states[`${scriptId}:${index}`];
  }
}

function performScript (script: Script, state: State, trace: Trace, context: EngraftContext): State {
  let newState = state;
  for (const [index, command] of script.commands.entries()) {
    Trace.set(trace, script.id, index, newState);
    newState = performCommand(command, newState, trace, context);
  }
  Trace.set(trace, script.id, script.commands.length, newState)
  return newState;
}

function performCommand (command: Command, state: State, trace: Trace, context: EngraftContext): State {
  if (command.type === 'if') {
    // console.log("found if");
    const conditionResult = runTool(new RefuncMemory(), {program: command.condition, varBindings: varBindingsFromState(state), context});
    // console.log("conditionResult");
    const conditionOutputState = EngraftPromise.state(conditionResult.outputP);
    if (conditionOutputState.status === 'rejected') { throw conditionOutputState.reason; }
    if (conditionOutputState.status === 'pending') { throw new Error(`Condition did not resolve immediately`); }

    const conditionOutput = conditionOutputState.value;
    if (typeof conditionOutput.value !== 'boolean') { throw new Error(`Expected condition to be a boolean`); }

    if (conditionOutput.value) {
      return performScript(command.then, state, trace, context);
    } else {
      return state;
    }
  } else if (command.type === 'translate-vector') {
    const vector = state[command.name];
    if (vector.type !== 'vector') { throw new Error(`Expected vector ${command.name} to be a vector`); }
    if (command.move.type === 'literal') {
      return {
        ...state,
        [command.name]: {
          ...vector,
          x: vector.x + command.move.x,
          y: vector.y + command.move.y,
        },
      };
    } else {
      const target = resolveMagnet(command.move.magnet, state);
      const vector = state[command.name];
      if (vector.type !== 'vector') { throw new Error(`Expected vector ${command.name} to be a vector`); }
      if (command.move.end === 'head') {
        return {
          ...state,
          [command.name]: {
            ...vector,
            x: target.x - vector.vx,
            y: target.y - vector.vy,
          },
        };
      } else {
        return {
          ...state,
          [command.name]: {
            ...vector,
            x: target.x,
            y: target.y,
          },
        };
      }
    }
  } else if (command.type === 'translate-point') {
    const point = state[command.name];
    if (point.type !== 'point') { throw new Error(`Expected point ${command.name} to be a point`); }
    if (command.move.type === 'literal') {
      return {
        ...state,
        [command.name]: {
          ...point,
          x: point.x + command.move.x,
          y: point.y + command.move.y,
        },
      };
    } else {
      const target = resolveMagnet(command.move.magnet, state);
      return {
        ...state,
        [command.name]: {
          ...point,
          x: target.x,
          y: target.y,
        },
      };
    }
  } else if (command.type === 'scale-vector') {
    const factorResult = runTool(new RefuncMemory(), {program: command.factor, varBindings: varBindingsFromState(state), context});
    const factorOutputState = EngraftPromise.state(factorResult.outputP);
    if (factorOutputState.status === 'rejected') { throw factorOutputState.reason; }
    if (factorOutputState.status === 'pending') { throw new Error(`Factor did not resolve immediately`); }

    const factorOutput = factorOutputState.value;
    // if (typeof factorOutput.value !== 'number') { throw new Error(`Expected factor to be a number`); }

    const vector = state[command.name];
    if (vector.type !== 'vector') { throw new Error(`Expected vector ${command.name} to be a vector`); }
    return {
      ...state,
      [command.name]: {
        ...vector,
        vx: vector.vx * (factorOutput.value as any)[0],
        vy: vector.vy * (factorOutput.value as any)[1],
      },
    };
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
