/* eslint-disable */
import {replace} from "estraverse";

const esprima = require('esprima');
const estraverse = require('estraverse')
const escodegen = require('escodegen')

import version from "./util/version";
import {defaultParams, countArgs} from "./util/ASTLibrary";

const VERSION = version

const codegen_options = {
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

function getCellId(cell) {
  return cellElem.getAttribute("data-node-id");
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

  // toolFromInputs()


  if (order === -1 || order === undefined) return

  const view = getView(getCell(order))
  console.log('updating engraft in cell ', order)

  // full old string
  const oldString = getText(view)

  // everything except the 'viewof' keyword since esprima can't parse that
  const content = oldString.replace(/\bviewof\b\s*/, '')
  const original_ast = esprima.parseScript(content)

  const num_args = countArgs(original_ast)
  // console.log(`number of args: ${num_args}`)

  if (num_args === 1) {
    // engraft(this)
    // post-startup, insert our necessary fields
    const replaced_ast = estraverse.replace(original_ast, {
      enter: function(node) {
        if (node.type === 'CallExpression') {
          node?.arguments.push(defaultParams)
        }
      }
    })

    const replacement = escodegen.generate(replaced_ast, )
    replaceText(view.editorView, `viewof ${replacement}`)
    return
  }

  // Otherwise, there are existing parameters:
  // replace [program] in parameters with updated program


  // stringify to use in parser
  const program_str = JSON.stringify(program)
  // parse
  let program_ast =  esprima.parseScript(`let a = ` + program_str )
  // console.log(program_ast)



  // this is an expression, extract the object to replace in the original string
  estraverse.traverse(program_ast, {
    enter: function(node) {
      if (node.type === 'ObjectExpression') {
        program_ast = node
        this.break()
      }
    }
  })
  //latest program string now represented as an AST

  let program_found = false
  let new_params_ast = estraverse.replace(original_ast, {
    enter: function(node) {
      if (node.type === 'Property' && node.key.name === 'program') {
        program_found = true
        return {
          type: 'Property',
          key: { type: 'Identifier', name: 'program' },
          value: program_ast,
          kind: 'init',
        }
      }
    }
  });




  // console.log('replaced')
  const replacement = escodegen.generate(new_params_ast, codegen_options)
  // console.log(replacement)

  // replace program string with new version
  // dispatch changes
  // console.log(oldString)
  // console.log(`writing ${replacement}`)
  replaceText(view.editorView, `viewof ${replacement}`)
}



window.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.source === "observable-writer") {
    console.log("parent got event", event.data);

    if (event.data.type === 'engraft-update') {
      const firstRun = event.data.firstRun

      if (firstRun) {
        console.log('INTERCEPTED')
      } else {
        handleEngraftUpdate(event)
      }



    }
  }

  if (event.data !== null && typeof event.data === "object" && event.data.source === "observable-check") {
    const order = event.data.order
    console.log(`Extension Received Health Check: Cell ${order}`)

    // click run on startup
    const button = getButton(getCell(order))
    const buttonActive = button?.firstChild?.getAttribute('fill') !== 'none'
    if (button && buttonActive) {
      button.click()
    }

    event.ports[0].postMessage({version : VERSION});
  }
  });
