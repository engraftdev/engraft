/* eslint-disable */

console.log("Observable Writer: injected_script.js running")

function replaceText (editorView, text) {
  editorView.dispatch({changes: { from: 0, to: editorView.state.doc.length, insert: text}});
}

function getCell(i) {
  return document.querySelectorAll("[data-node-id]")[i];
}

function getCellId(cell) {
  return cellElem.getAttribute("data-node-id");
}

function getView(cell) {
  return cell.querySelector(".cm-content")?.cmView;
}

function getText(view) {
  return view?.editorView.state.doc.toString();
}

window.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.source === "observable-writer") {
    console.log("parent got event", event.data);
    if (event.data.type === "click") {
      console.log("click!");
      const { order } = event.data;
      const view = getView(getCell(order));
      replaceText(view.editorView, "WOW");
    }
    if (event.data.type === 'engraft-update') {
      const {order, program} = event.data;

      if (order === -1 || order === undefined) return

      const view = getView(getCell(order));
      console.log('updating engraft in cell ', order)

      // matches the engraft function call:
      //  engraft(key: string, inputs: {}, this, hide: bool, programString: ToolProgram)
      //
      // lookbehind matches: engraft(key: string, inputs: {}, this, hide: bool,
      // prog matches: programString json
      // lookahead matches: ending parenthesis

      const re = /(?<=engraft\(\s*'\w+'\s*,\s*{.*?}\s*,\s*this\s*,\s*){.*}|null?\s*(?=\s*,\s*(true|false|)*\)$)/
      const oldString = view.editorView.state.doc.toString()
      const newString = oldString.replace(re, JSON.stringify(program))

      replaceText(view.editorView, newString)
    }
  }
});