import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { CSSProperties, memo, useEffect, useMemo, useRef, useState } from "react"

export interface MyCodeMirrorProps {
  extensions: Extension[];
  style?: CSSProperties;

  text: string;
  onChange: (text: string) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  autoFocus?: boolean;
}

const CodeMirror = memo(function CodeMirror({extensions, style = {}, text, onChange, onFocus, onBlur, autoFocus}: MyCodeMirrorProps) {
  const [div, setDiv] = useState<HTMLDivElement | null>();
  const stateRef = useRef<EditorState>();
  const viewRef = useRef<EditorView>();

  const allExtensions = useMemo(() => {
    let allExtensions = extensions.slice();
    allExtensions.push(EditorView.updateListener.of((vu: ViewUpdate) => {
      if (vu.docChanged) {
        const doc = vu.state.doc;
        const text = doc.toString();
        onChange(text);
      }
      if (vu.focusChanged) {
        if (vu.view.hasFocus) {
          onFocus && onFocus();
        } else {
          onBlur && onBlur();
        }
      }
    }));
    return allExtensions
  }, [extensions, onBlur, onChange, onFocus]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({ effects: StateEffect.reconfigure.of(allExtensions) });
    }
  }, [allExtensions]);

  useEffect(() => {
    if (div && !stateRef.current) {
      stateRef.current = EditorState.create({
        doc: text,
        extensions: allExtensions,
      });
      viewRef.current = new EditorView({
        state: stateRef.current,
        parent: div,
      });

      if (autoFocus) {
        viewRef.current.focus();
      }
    }
  });

  // TODO:
  // ok this REALLY SUCKS but apparently if you nest code inside of three layers of notebooks...
  // and type fast...
  // you get feedback loops from this.
  // clearly this should be fixed. for now: we comment it out.

  // useEffect(() => {
  //   const view = viewRef.current;
  //   if (!viewRef.current) { return; }
  //   const currentText = view ? view.state.doc.toString() : '';
  //   if (view && text !== currentText) {
  //     view.dispatch({
  //       changes: { from: 0, to: currentText.length, insert: text || '' },
  //     });
  //   }
  // }, [text]);

  return <div ref={setDiv} className="cm-theme cm-theme-light" style={style}/>
})
export default CodeMirror;
