/* eslint-disable */

import esprima from 'esprima'
import estraverse from 'estraverse'
import escodegen from 'escodegen'

import version from "./util/version";
import {defaultParams, countArgs} from "./util/ASTLibrary";

const VERSION = version

const countMap = new Map();

const codegenOptions = {
  format: {
    compact: true,
    quotes: 'single',
  }
}

console.log(`Observable Writer v${VERSION} running`)

function replaceText (editorView, text, index = 0) {
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text},
    addToHistory: true
  });
}

function getCell(i) {
  return document.querySelectorAll("[data-node-id]")[i];
}

function getView(cell) {
  return cell.querySelector(".cm-content")?.cmView;
}

function getButton(cell) {
  return cell?.querySelector("button")

}

function getText(view) {
  return view?.editorView.state.doc.toString();
}

function handleEngraftUpdate(event) {
  const {order, program} = event.data;


  if (order === -1 || order === undefined) return

  const view = getView(getCell(order))

  // full old string
  const oldString = getText(view)

  // everything except the 'viewof' keyword since esprima can't parse that
  const content = oldString.replace(/\bviewof\b\s*/, '')
  const originalAST = esprima.parseScript(content)

  const numArgs = countArgs(originalAST)

  if (numArgs === 1) {
    // engraft(this)
    // post-startup, insert our necessary fields
    const replacedAST = estraverse.replace(originalAST, {
      enter: function(node) {
        if (node.type === 'CallExpression') {
          node?.arguments.push(defaultParams)
        }
      }
    })

    const replacement = escodegen.generate(replacedAST, codegenOptions)
    replaceText(view.editorView, `viewof ${replacement}`)
    return
  }

  // Otherwise, there are existing parameters:
  // replace [program] in parameters with updated program


  // stringify to use in parser
  const programStr = JSON.stringify(program)
  // parse
  let programAST =  esprima.parseScript(`let a = ` + programStr )



  // this is an expression, extract the object to replace in the original string
  estraverse.traverse(programAST, {
    enter: function(node) {
      if (node.type === 'ObjectExpression') {
        programAST = node
        this.break()
      }
    }
  })
  //latest program string now represented as an AST

  let newParamsAST = estraverse.replace(originalAST, {
    enter: function(node) {
      if (node.type === 'Property' && node.key.name === 'program') {
        return {
          type: 'Property',
          key: { type: 'Identifier', name: 'program' },
          value: programAST,
          kind: 'init',
        }
      }
    }
  });


  const replacement = escodegen.generate(newParamsAST, codegenOptions)

  // replace program string with new version
  // dispatch changes
  replaceText(view.editorView, `viewof ${replacement}`)
}




window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (typeof event.data !== "object") return;
  if (event.data.source !== "observable-writer") return;

  if (event.data.type === 'engraft-update' ) {
    const {order} = event.data;
    if (!order || order === -1) return;
    const cell_count = countMap.get(order) || 0; // get count, or 0 if we haven't seen this cell before
    if (cell_count === 0) {
      // Page refreshes and script is restarted
      // We rely on Observable's last cached editor value, push that to React component with the play button

      const button = getButton(getCell(order))
      const buttonActive = button?.firstChild?.getAttribute('fill') !== 'none'
      if (button && buttonActive) button.click()

    } else {
      // General case, update as usual, component program and editor are kept in sync by extension
      // This handles the case where users manually update the editor and press 'sync', in which case our program manually syncs.
      handleEngraftUpdate(event)
    }
    countMap.set(order, cell_count + 1);
  }

  if (event.data.type === "engraft-check") {
    event.ports[0].postMessage({version : VERSION});
  }

  });
