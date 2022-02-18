import { EditorState, Extension } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { useEffect, useRef, useState } from "react"

export interface MyCodeMirrorProps {
  extensions: Extension[];

  value: string;
  onChange: (value: string) => void;

  autoFocus: boolean;
}

export default function CodeMirror({extensions, value, onChange, autoFocus}: MyCodeMirrorProps) {
  const [div, setDiv] = useState<HTMLDivElement | null>();
  const stateRef = useRef<EditorState>();
  const viewRef = useRef<EditorView>();

  useEffect(() => {
    if (div && !stateRef.current) {
      let allExtensions = extensions.slice();
      allExtensions.push(EditorView.updateListener.of((vu: ViewUpdate) => {
        if (vu.docChanged) {
          const doc = vu.state.doc;
          const value = doc.toString();
          onChange(value);
        }
      }));

      stateRef.current = EditorState.create({
        doc: value,
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
  })

  // TODO: this part might not be necessary; just make `value` into `initialValue` and have it be uncontrolled?
  // tho it feels weird to know you can't have multiple views pointing at the same config... sounds wrong to me
  // (they may actually want to share the same editorstate; this is a call for toolcall vs tooluse or w/e)
  useEffect(() => {
    const view = viewRef.current;
    if (!viewRef.current) { return; }
    const currentValue = view ? view.state.doc.toString() : '';
    if (view && value !== currentValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value || '' },
      });
    }
  }, [value]);

  return <div ref={setDiv} className="cm-theme cm-theme-light"/>
}