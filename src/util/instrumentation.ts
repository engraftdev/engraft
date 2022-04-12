// note from josh: some of the following is adapted from a friend's code – please chat before reusing it

import { parseExpressionAt, Node as AcornNode } from 'acorn';
import { generate } from 'astring'

import * as est from 'estree';

function isIfStatement(node: any): node is est.IfStatement & AcornNode { return node.type === 'IfStatement'; }
function isCallExpression(node: any): node is est.CallExpression & AcornNode { return node.type === 'CallExpression'; }
function isVariableDeclarator(node: any): node is est.VariableDeclarator & AcornNode { return node.type === 'VariableDeclarator'; }
function isAssignmentExpression(node: any): node is est.AssignmentExpression & AcornNode { return node.type === 'AssignmentExpression'; }
function isReturnStatement(node: any): node is est.ReturnStatement & AcornNode { return node.type === 'ReturnStatement'; }
function isConditionalExpression(node: any): node is est.ConditionalExpression & AcornNode { return node.type === 'ConditionalExpression'; }

function start(node: est.Node): number;
function start(node?: est.Node): number | undefined;
function start(node?: est.Node): number | undefined {
  return node === undefined ? undefined : (node as AcornNode).start;
}

function end(node: est.Node): number;
function end(node?: est.Node): number | undefined;
function end(node?: est.Node): number | undefined {
  return node === undefined ? undefined : (node as AcornNode).end;
}

export interface Range {
  start: number,
  end: number,
}

export interface Callbacks {
  __inst_IfStatement_test(range: Range & {consequentStart: number, consequentEnd: number, alternateStart?: number, alternateEnd?: number}, value: any): any
  __inst_VariableDeclarator_init(range: Range, value: any): any
  __inst_AssignmentExpression_right(range: Range, value: any): any
  __inst_ReturnStatement_argument(range: Range, value: any): any
  __inst_lineNum(num: number): void
}


export function instrumentCode(code: string): string {
  const parsed = parseExpression(code);
  const transformed = walk(parsed) as est.Node;
  return generate(transformed);
}

export function parseExpression(expr: string): est.Expression & AcornNode {
  return parseExpressionAt(expr, 0, { ecmaVersion: 11, locations: true }) as est.Expression & AcornNode;
}

export function parseCallExpression(expr: string, ...moreArgs: est.Expression[]): est.CallExpression & AcornNode {
  const parsed = parseExpression(expr);
  if (!isCallExpression(parsed)) { throw new Error("internal error!"); }
  return {...parsed, arguments: [...parsed.arguments, ...moreArgs]};
}

function nodeInfo(node: est.Node) {
  return {start: start(node), end: end(node)};
}

export const walk = (node: any): unknown => {
  if (!node) return node;

  if (isIfStatement(node) || isConditionalExpression(node)) {
    const test = node.test;
    const consequent = node.consequent;
    const alternate = node.alternate || undefined;
    const info = JSON.stringify({
      ...nodeInfo(test),
      consequentStart: start(consequent), consequentEnd: end(consequent),
      alternateStart: start(alternate), alternateEnd: end(alternate),
    });
    const newNode: est.IfStatement | est.ConditionalExpression = {...node, test: parseCallExpression(`__inst_IfStatement_test(${info})`, test)};
    node = newNode
  } else if (isVariableDeclarator(node)) {
    const init = node.init;
    if (init) {
      const info = JSON.stringify(nodeInfo(init))
      const newNode: est.VariableDeclarator = {...node, init: parseCallExpression(`__inst_VariableDeclarator_init(${info})`, init)};
      node = newNode;
    }
  } else if (isAssignmentExpression(node)) {
    const right = node.right;
    const info = JSON.stringify(nodeInfo(right))
    const newNode: est.AssignmentExpression = {...node, right: parseCallExpression(`__inst_AssignmentExpression_right(${info})`, right)};
    node = newNode;
  } else if (isReturnStatement(node)) {
    const argument = node.argument;
    if (argument) {
      const info = JSON.stringify(nodeInfo(argument))
      const newNode: est.ReturnStatement = {...node, argument: parseCallExpression(`__inst_ReturnStatement_argument(${info})`, argument)};
      node = newNode;
    }
  }

  // Interspersing _ENV.lineNum() calls
  if (node.body && Array.isArray(node.body) && node.type !== "ClassBody") {
    node = { ...node, body: enhanceWithLineNumbers(node.body) };
  } else if (node.consequent && Array.isArray(node.consequent)) {
    node = { ...node, consequent: enhanceWithLineNumbers(node.consequent) };
  }

  // Properties of nodes
  if (Array.isArray(node)) {
    return node.map((child) => walk(child));
  } else if (typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]))
  } else {
    return node;
  }
};


const enhanceWithLineNumbers = (body: est.Node[]) => {
  // TODO: node.body of `while(true);` is type EmptyStatement... look into
  // converting to BlockStatement and preventing runaway loops
  const enhancedBody: est.Node[] = [];
  for (const childNode of body) {
    if (childNode) {
      if (childNode.loc) {
        // Using end line, b/c we want console and errors to show after the
        // source code location
        enhancedBody.push(makeLineNumExpressionStatement(childNode.loc.end.line));
      }
      enhancedBody.push(childNode);
    }
  }
  return enhancedBody;
};

const makeLineNumExpressionStatement: (num: number) => est.ExpressionStatement = (num) => {
  const jsCode = `__inst_lineNum(${num});`;
  const expression = parseExpression(jsCode);
  return {
    type: 'ExpressionStatement',
    expression
  };
};
