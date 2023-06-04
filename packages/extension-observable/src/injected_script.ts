/* eslint-disable */

import esprima from 'esprima'
import estraverse from 'estraverse'
import escodegen from 'escodegen'

import version from "./util/version.js";
// @ts-ignore
import {defaultParams, countArgs, parseObjectToAST} from "./util/ASTLibrary.ts";
import estree, {CallExpression, Literal, ObjectExpression, Property} from "estree";
import {ToolProgram} from "@engraft/core";
import {EditorView} from "@codemirror/view";
import {ChangeSpec} from "@codemirror/state";

const VERSION = version
const DEBUG = import.meta.env.DEV // vite: boolean if we are running in dev env or not
const countMap = new Map();

const codegenOptions = {
  format: {
    compact: true,
    quotes: 'single',
  }
}

console.log(`Engraft-Observable Writer v${VERSION} running`)

function replaceText (editorView: EditorView, text:string) {
  editorView.dispatch({
    changes: <ChangeSpec> {from: 0, to: editorView.state.doc.length, insert: text},
  });
}

function getCell(i : number) {
  return document.querySelectorAll("[data-node-id]")[i];
}

function getView(cell : any) {

  return cell.querySelector(".cm-content")?.cmView;
}

function getButton(cell : any) : HTMLElement{
  return cell?.querySelector("button")

}

function getText(view : any) : string{
  return view?.editorView.state.doc.toString();
}

function handleEngraftUpdate(event: MessageEvent): void {
  const {order, program}:{order:number, program:ToolProgram} = event.data;

  if (order === -1 || order === undefined) return

  const view = getView(getCell(order))
  // full old string
  let oldString = getText(view)

  // grab everything except the 'viewof' keyword since esprima can't parse that
  const content = oldString.replace(/\bviewof\b\s*/, '')
  let originalAST = esprima.parseScript(content)

  const numArgs = countArgs(originalAST)
  // if there are no exisiting parameters, initialize a basic skeleton for the AST replacement to detect.
  if (numArgs === 1) {
    // engraft(this)
    // post-startup, insert our necessary fields for the remaining code to modify
    const replacedAST = estraverse.replace(originalAST, {
      enter: function(node) {
        if (node.type === 'CallExpression') {
          (node as CallExpression).arguments.push(defaultParams())
          this.break()
        }

      }
    })

    originalAST = replacedAST as esprima.Program
  }
  // Otherwise, there are existing parameters:
  // replace [program] in parameters with updated program


  // convert the object to replace in the original string
  const programObjExprAST = parseObjectToAST(program) as ObjectExpression
  // latest program string now represented as an AST

  let nestedLevel = 0;
  // this is necessary to only replace the top-level object called 'program'
  // tools like /notebook that have nested 'program' fields will recurse infinitely without this.
  let newParamsAST = estraverse.replace(originalAST, {
    enter: function(node) : estree.Node | void | estraverse.VisitorOption{

      if (node.type === 'Property') {
        const prop = node as Property
        const key = (prop.key as Literal).value

        if (key === 'program' && nestedLevel == 0) {
          nestedLevel++
          return  ({
            type: 'Property',
            key: {type: 'Literal', value: 'program'},
            value: programObjExprAST,
            kind: 'init',
            method: false,
            shorthand: false,
            computed: false
          } as Property)
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
    logger(`updating engraft in cell ${order}`)
    const cell_count = countMap.get(order) || 0; // get count, or 0 if we haven't seen this cell before
    if (cell_count === 0) {
      // Page refreshes and script is restarted
      // We rely on Observable's last cached editor value, push that to React component with the play button
      const button = getButton(getCell(order))
      const buttonActive = (button.firstChild as HTMLElement).getAttribute('fill') !== 'none'
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

const logger = (input: any) => {
  if (DEBUG) {
    console.log(input)
  }
}