/* eslint-disable */

console.log("Observable Writer: injected_script.js running")

function replaceText (editorView, text) {
  editorView.dispatch({changes: { from: 0, to: editorView.state.doc.length, insert: text}});
}

// let cells, cellIds;

function getCells() {
  const cellElems = document.querySelectorAll("[data-node-id]");
  return [...cellElems].map(cellElem => {
    const cellId = cellElem.getAttribute("data-node-id");
    const view = cellElem.querySelector(".cm-content")?.cmView;
    // const text = view?.editorView.state.doc.toString();
    return { cellElem, cellId, view };
  });
}

// function onNotebookChange() {
//   const cellElems = document.querySelectorAll("[data-node-id]");
//   cells = [...cellElems].map(cellElem => {
//     const cellId = cellElem.getAttribute("data-node-id");
//     const view = cellElem.querySelector(".cm-content").cmView;
//     const text = view.editorView.state.doc.toString();
//     return { cellElem, cellId, view, text };
//     // cell.addEventListener("click", () => {
//     //   console.log("Observable Writer: cell clicked");
//     //   const nodeId = cell.getAttribute("data-node-id");
//     //   window.postMessage({ type: "OBSERVABLE_WRITER_CELL_CLICKED", nodeId }, "*");
//     // });
//   });
//   window.cells = cells;

//   cellIds = cells.map(c => c.cellId);
//   console.log("notebookChange", cellIds);
// };

// new MutationObserver(function () {
//   onNotebookChange();
// }).observe(document.querySelector(".notebook"), {
//   childList: true,
// });

// onNotebookChange();

window.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.source === "observable-writer") {
    console.log("parent got event", event.data);
    if (event.data.type === "click") {
      console.log("click!");
      const { order } = event.data;
      const { cellId, view } = getCells()[order];
      replaceText(view.editorView, "WOW");
    }
    // console.log("parent got event", event.data);
  }
});
