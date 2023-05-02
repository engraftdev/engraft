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

function splice(source, index, text) {
  return source.slice(0, index) + text + source.slice(index);
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


      // Detects the keyword engraft(this), selecting everything between this and )
      const funcCall_re = /(?<=engraft\(this).*(?=\)$)/
      const oldString = view.editorView.state.doc.toString()

      const content = oldString.match(funcCall_re)
      const index = content.index
      const params = content[0]

      const progAndInputs = "{inputs: {}, program:{}}"
      console.log(params)


      if (params.length === 0) {
        // engraft(this)
        replaceText(view.editorView, splice(oldString, index, ", " + progAndInputs))
      } else {
        // engraft(this, {inputs: {}, program:{}})
        const input_re = /(?<=input\s*:\s*_){.*}(?=})/
        console.log(params)
        console.log(params.match(input_re))
      }
    }
  }
});
