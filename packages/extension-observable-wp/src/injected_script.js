/* eslint-disable */
const esprima = require('esprima');


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

// Adds double quotes around keywords in a JSON string that were not already quoted
// Necessary to not break JSON.parse() if user manually defines inputs or programs without using quotes
function quoteJSON(str) {
  // Use a regular expression to match keys that are not already quoted
  const regex = /([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g;

  // Replace each matched key with a quoted key
  return str.replace(regex, '$1"$2":');
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
      /*
      Explanation:
        (?<=engraft\(this[^,]*,)
          is a positive lookbehind assertion that matches the string "engraft(this" followed by any number of non-comma characters, and a comma. This is not included in the final match.
        [^)]*
          matches any number of non-closings-parenthesis characters.
        (?=\)$)
          is a positive lookahead assertion that matches a ")" at the end of the line, without including it in the final match.
       */
      const funcCall_re = /(?<=engraft\(this)[^)]*(?=\)$)/
      const oldString = view.editorView.state.doc.toString()

      const content = oldString.match(funcCall_re)
      const index = content.index
      const params = content[0]

      const progAndInputs = "{\"inputs\": {}, \"program\":{}}"

      if (params.length === 0) {
        // engraft(this)
        // post-startup, insert our necessary fields
        replaceText(view.editorView, splice(oldString, index, ", " + progAndInputs))
      } else {
        // engraft(this, {inputs: {}, program:{}})

        // trim excess comma and whitespace from start of stirng
        const cleaned = params.replace(/^\s*,\s*/, '');
        console.log("var a = " + cleaned)
        const parsed = esprima.parse("var a = " + cleaned)
        console.log(parsed)
        // replace program string with new version
        // dispatch changes
        // replaceText(view.editorView, oldString.slice(0, index) + JSON.stringify(obj) + ")")
      }
    }
  }
});

