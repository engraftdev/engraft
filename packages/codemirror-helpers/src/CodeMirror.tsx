import { EditorState, Extension, StateEffect } from "@codemirror/state";
import { EditorView, ViewUpdate, tooltips } from "@codemirror/view";
import { CSSProperties, memo, useEffect, useMemo, useRef, useState } from "react"
import useInterval from "./useInterval.js";

export type CodeMirrorProps = {
  extensions: Extension[],
  style?: CSSProperties,

  text: string,
  onChange: (text: string) => void,

  onFocus?: () => void,
  onBlur?: () => void,

  autoFocus?: boolean,

  putTooltipsInRoot?: boolean,
}

export const CodeMirror = memo(function CodeMirror(props: CodeMirrorProps) {
  const { extensions, style = {}, text, onChange, onFocus, onBlur, autoFocus, putTooltipsInRoot = true } = props;

  const [div, setDiv] = useState<HTMLDivElement | null>();
  const stateRef = useRef<EditorState>();
  const viewRef = useRef<EditorView>();

  const allExtensions = useMemo(() => {
    if (!div) { return undefined; }

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

    if (putTooltipsInRoot) {
      // motivation: fixes layout of autocomplete tooltip in notebook-canvas
      const rootNode = div.getRootNode() as Document | ShadowRoot;
      const tooltipParent = rootNode instanceof Document ? document.body : rootNode as unknown as HTMLElement;
      allExtensions.push(tooltips({ position: 'absolute', parent: tooltipParent }))
    }
    return allExtensions
  }, [div, extensions, onBlur, onChange, onFocus, putTooltipsInRoot]);

  useEffect(() => {
    if (viewRef.current && allExtensions) {
      viewRef.current.dispatch({ effects: StateEffect.reconfigure.of(allExtensions) });
    }
  }, [allExtensions]);

  useEffect(() => {
    if (div && allExtensions && !stateRef.current) {
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

  // TODO: I can't remember exactly why I added this. Looks like it was added when I was working on
  // notebook-canvas. It would be nice to track down exacly why it is needed, and ideally replace it
  // with a more targetted solution.
  useInterval(() => {
    if (viewRef.current) {
      viewRef.current.requestMeasure();
    }
  }, 100);

  // TODO: In the age of reportView, this didn't work. It seems to work now, which is great. But
  // let's monitor it. (Tests?)
  useEffect(() => {
    const view = viewRef.current;
    if (!viewRef.current) { return; }
    const currentText = view ? view.state.doc.toString() : '';
    if (view && text !== currentText) {
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: text || '' },
      });
    }
  }, [text]);

  return <div ref={setDiv} className="cm-theme cm-theme-light" style={style}/>
})
