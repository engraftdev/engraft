/* eslint-disable */
const esprima = require('esprima');
const estraverse = require('estraverse')
const escodegen = require('escodegen')

console.log("Observable Writer: injected_script.js running")

function replaceText (editorView, text, index = 0) {
  editorView.dispatch({changes: { from: index, to: editorView.state.doc.length, insert: text}});
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

function handleEngraftUpdate(event) {
  const {order, program} = event.data;
  // toolFromInputs()
  const a = {
    'toolName': 'slot',
    'modeName': 'code',
    'code': '',
    'defaultCode': '',
    'subPrograms': {}
  }

  const defaultProgram = {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'toolName' },
        value: {type: 'Literal', value: 'slot'},
      },
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'modeName' },
        value: {type: 'Literal', value: 'code'},
      },
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'code' },
        value: {type: 'Literal', value: ''},
      },
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'defaultCode' },
        value: {type: 'Literal', value: ''},
      },
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'subPrograms' },
        value: {type: 'ObjectExpression', properties: []},
      },
    ]
  }

  const defaultParams = {
    type: "ObjectExpression",
    properties: [
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'inputs' },
        value: {type: "ObjectExpression", properties:[]},
      },
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'program' },
        value: defaultProgram
      }
    ]
  }

  if (order === -1 || order === undefined) return

  const view = getView(getCell(order));
  console.log('updating engraft in cell ', order)

  // full old string
  const oldString = view.editorView.state.doc.toString()

  // everything except the 'viewof' keyword since esprima can't parse that
  const content = oldString.replace(/\bviewof\b\s*/, '')
  const original_ast = esprima.parseScript(content)

  const num_args = AST_countArgs(original_ast)
  console.log(`number of args: ${num_args}`)

  if (num_args === 1) {
    // engraft(this)
    // post-startup, insert our necessary fields
    const replaced_ast = estraverse.replace(original_ast, {
      enter: function(node) {
        if (node.type === 'CallExpression') {
          node.arguments.push(defaultParams)
        }
      }
    })

    const replacement = escodegen.generate(replaced_ast, {format: {compact: true}})
    replaceText(view.editorView, `viewof ${replacement}`)
    return
  }

  // Otherwise, there are existing parameters:
  // replace [program] in parameters with updated program


  // stringify to use in parser
  const program_str = JSON.stringify(program)
  // parse
  let program_ast =  esprima.parseScript(`let a = ` + program_str )
  console.log(program_ast)



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
  //
  //
  // console.log('FLAG')
  // const program_code = escodegen.generate(program_ast)
  // console.log(program_code)
  //
  // console.log('original')
  // console.log(original_ast)
  // console.log(escodegen.generate(original_ast))
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




  console.log('replaced')
  const replacement = escodegen.generate(new_params_ast, {format: {compact: true}})
  console.log(replacement)

  // replace program string with new version
  // dispatch changes
  replaceText(view.editorView, `viewof ${replacement}`)
}

function AST_countArgs(ast) {
  let call;
  estraverse.traverse(ast, {
    enter: function(node) {
      if (node.type === 'CallExpression') {
        call = node
      }
    }
  })

  return call?.arguments.length || 0
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
      handleEngraftUpdate(event)
    }
  }
});
