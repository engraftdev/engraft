import { EditorSelection, EditorState, Extension, StateField, TransactionSpec, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { RangeSet } from "@codemirror/rangeset";
import PortalSet from "./PortalSet";
import PortalWidget from "./PortalWidget";
import { idRegExp } from "./id";

export function refCode(s: string) {
  return s;
}
const refRE = new RegExp(refCode(`(${idRegExp})`), "g")

function refsFromText(text: Text, portalSet: PortalSet<{id: string}>) {
  const matches = Array.from(text.sliceString(0).matchAll(refRE));

  return RangeSet.of(
    matches.map((match) => {
      return Decoration.replace({
        widget: new PortalWidget(portalSet, {id: match[1]}),
        inclusive: false,
      }).range(match.index!, match.index! + match[0].length)
    })
  );
}

export default function refsExtension(portalSet: PortalSet<{id: string}>): Extension {
  const refsField = StateField.define<DecorationSet>({
    create(state) {
      return refsFromText(state.doc, portalSet)
    },
    update(old, tr) {
      return refsFromText(tr.newDoc, portalSet)
    },
    provide: f => EditorView.decorations.from(f)
  });

  const jumpOverRefs = EditorState.transactionFilter.of(tr => {
    const refs = tr.startState.field(refsField)

    // TODO: only single selection will be supported

    if (tr.isUserEvent('select')) {
      let {head, anchor} = tr.newSelection.main;
      let change = false;
      refs.between(head, head, (refFrom, refTo, ref) => {
        function applyWormhole(src: number, dst: number) {
          if (head === src) { head = dst; change = true; }
          if (anchor === src) { anchor = dst; change = true; }
        }
        applyWormhole(refTo - 1, refFrom);
        applyWormhole(refFrom + 1, refTo);
        if (change) { return false; }
      })
      if (change) {
        return [tr, {selection: tr.newSelection.replaceRange(EditorSelection.range(anchor, head))}];
      }
    } else if (tr.isUserEvent('delete.forward') || tr.isUserEvent('delete.backward')) {
      const forward = tr.isUserEvent('delete.forward')

      const head = tr.startState.selection.main.head;
      let result: TransactionSpec | readonly TransactionSpec[] = tr;
      refs.between(head, head, (refFrom, refTo, ref) => {
        if (head === (forward ? refFrom : refTo)) {
          result = [{changes: {from: refFrom, to: refTo}}];
          return false;
        }
      });
      return result;
    }

    return tr;
  })

  return [refsField, jumpOverRefs]
}
