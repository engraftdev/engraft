type DragProps<T> = {
  init(): T,
  move(this: MoveThis, state: T): void,
  done(state: T): void,
  keepCursor?: boolean,
  cursor?: string,
}

type MoveThis = {
  event: MouseEvent,
  startEvent: React.MouseEvent,
}

export function drag<T>(props: DragProps<T>) {
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
      cursorToUse = getComputedStyle(startEvent.currentTarget).cursor;
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

let cursorStyleAdded = false;
function addCursorStyle() {
  if (cursorStyleAdded) { return; }
  cursorStyleAdded = true;

  const style = document.createElement('style');
  style.innerHTML = cursorValues.map(cursor =>
    `.cursor-${cursor} * { cursor: ${cursor} !important; }`
  ).join('\n');
  document.head.appendChild(style);
}

const cursorValues = [
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
]
