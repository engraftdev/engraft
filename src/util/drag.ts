export type Drag<T> = {
  init(): T,
  move(this: MoveThis, state: T): void,
  done(state: T): void,
  keepCursor?: boolean,
  cursor?: CursorValue,
}

type MoveThis = {
  event: MouseEvent,
  startEvent: React.MouseEvent,
}

export function startDrag<T>(props: Drag<T>) {
  const {init, move, done, cursor, keepCursor} = props;

  if (cursor && keepCursor) {
    throw new Error('keepCursor and cursor are mutually exclusive');
  }

  addCursorStyle();

  return (startEvent: React.MouseEvent<HTMLDivElement>) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const state = init();

    let cursorToUse = cursor;
    if (keepCursor) {
      cursorToUse = getComputedStyle(startEvent.currentTarget).cursor as any;
    }

    const onMousemove = (event: MouseEvent) => {
      move.call({event, startEvent}, state)
    }
    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
      if (cursorToUse) {
        document.body.classList.remove(`cursor-${cursorToUse}`);
      }
      done(state);
    }
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    if (cursorToUse) {
      document.body.classList.add(`cursor-${cursorToUse}`);
    }
  };
};

export function someDrag <T>(drag: Drag<T>) {
  return drag;
}

export function combineDrags <T, U>(drag1: Drag<T>, drag2: Drag<U>): Drag<T & U> {
  return {
    init() {
      return {
        ...drag1.init(),
        ...drag2.init(),
      };
    },
    move(this: MoveThis, state: T & U) {
      drag1.move.call(this, state);
      drag2.move.call(this, state);
    },
    done(state: T & U) {
      drag1.done(state);
      drag2.done(state);
    },
    keepCursor: drag1.keepCursor || drag2.keepCursor,
    cursor: drag1.cursor || drag2.cursor,
  };
}



// managing cursor stylesheet

enum CursorValueEnum {
  'alias',
  'all-scroll',
  'auto',
  'cell',
  'col-resize',
  'context-menu',
  'copy',
  'crosshair',
  'default',
  'e-resize',
  'ew-resize',
  'grab',
  'grabbing',
  'help',
  'move',
  'n-resize',
  'ne-resize',
  'nesw-resize',
  'ns-resize',
  'nw-resize',
  'nwse-resize',
  'no-drop',
  'none',
  'not-allowed',
  'pointer',
  'progress',
  'row-resize',
  's-resize',
  'se-resize',
  'sw-resize',
  'text',
  'url',
  'w-resize',
  'wait',
  'zoom-in',
  'zoom-out',
}
type CursorValue = keyof typeof CursorValueEnum;

let cursorStyleAdded = false;
function addCursorStyle() {
  if (cursorStyleAdded) { return; }
  cursorStyleAdded = true;

  const style = document.createElement('style');
  style.innerHTML = Object.values(CursorValueEnum).map(cursor =>
    `.cursor-${cursor} * { cursor: ${cursor} !important; }`
  ).join('\n');
  document.head.appendChild(style);
}
