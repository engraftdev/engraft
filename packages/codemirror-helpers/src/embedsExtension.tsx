import { EditorSelection, EditorState, Extension, StateField, TransactionSpec, Text, RangeSet } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { PortalSet, PortalWidget } from "./PortalWidget.js";


// embedsExtension is a CodeMirror extension which lets you embed arbitrary React-rendered content
// ("embeds") into the editor in place of specific strings ("embed ids") detected by regex. Embeds
// will act like characters; arrow keys / backspace / etc. will treat them as single units.

function embedsFromText(text: Text, portalSet: PortalSet<{id: string}>, embedIdRE: RegExp) {
  const matches = Array.from(text.sliceString(0).matchAll(embedIdRE));

  return RangeSet.of(
    matches.map((match) => {
      return Decoration.replace({
        widget: new PortalWidget(portalSet, {id: match[1]}),
        inclusive: false,
      }).range(match.index!, match.index! + match[0].length)
    })
  );
}

export function embedsExtension(portalSet: PortalSet<{id: string}>, embedIdRE: RegExp): Extension {
  const embedsField = StateField.define<DecorationSet>({
    create(state) {
      return embedsFromText(state.doc, portalSet, embedIdRE)
    },
    update(old, tr) {
      return embedsFromText(tr.newDoc, portalSet, embedIdRE)
    },
    provide: f => EditorView.decorations.from(f)
  });

  const jumpOverEmbeds = EditorState.transactionFilter.of(tr => {
    const embeds = tr.startState.field(embedsField)

    // TODO: only single selection will be supported

    if (tr.isUserEvent('select')) {
      let {head, anchor} = tr.newSelection.main;
      let change = false;
      embeds.between(head, head, (embedFrom, embedTo, embed) => {
        function applyWormhole(src: number, dst: number) {
          if (head === src) { head = dst; change = true; }
          if (anchor === src) { anchor = dst; change = true; }
        }
        applyWormhole(embedTo - 1, embedFrom);
        applyWormhole(embedFrom + 1, embedTo);
        if (change) { return false; }
      })
      if (change) {
        return [tr, {selection: tr.newSelection.replaceRange(EditorSelection.range(anchor, head))}];
      }
    } else if (tr.isUserEvent('delete.forward') || tr.isUserEvent('delete.backward')) {
      const forward = tr.isUserEvent('delete.forward')

      const head = tr.startState.selection.main.head;
      let result: TransactionSpec | readonly TransactionSpec[] = tr;
      embeds.between(head, head, (refFrom, refTo, ref) => {
        if (head === (forward ? refFrom : refTo)) {
          result = [{changes: {from: refFrom, to: refTo}}];
          return false;
        }
      });
      return result;
    }

    return tr;
  })

  return [embedsField, jumpOverEmbeds]
}
