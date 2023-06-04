import estraverse from "estraverse";
import esprima from "esprima";
import estree, {CallExpression} from 'estree';



const defaultProgramAST = {
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

export const defaultParamsAST = {
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
            value: defaultProgramAST
        }
    ]
}

export function countArgs(ast: estree.Node) {
    const call = findFirstMatchingNode(ast, 'CallExpression');

    if (!call) {
        return 0;
    }

    return (call as CallExpression).arguments.length

}

// Returns the first occurence of ObjectExpression in an AST
// Used to extract an ObjectExpression from a parsed statement since esprima can't parse objects on its own.
export function findFirstMatchingNode(ast: estree.Node, nodeType: estraverse.NodeType) : estree.Node | null {
    let res: estree.Node | null = null; // define as null || Node
    estraverse.traverse(ast, {
        enter: function(node) {
            if (node.type === nodeType) {
                res = node
                this.break()
            }
        }
    })


    return res;
}

// Receives an object expression
export function parseObjectToAST(obj: Object)  : estree.Node {
    try {
        // stringify to use in parser, then parse into AST
        let ast : esprima.Program =  esprima.parseScript(`let a = ` + JSON.stringify(obj))
        const res =  findFirstMatchingNode(ast, 'ObjectExpression');
        if (res === null) {
            throw new Error(`Node of type ObjectExpression not found`)
        }
        return res;
    } catch (e) {
        throw e
    }
}

export function defaultParams() : estree.Node  {
    const paramString = {
        inputs: [],
        program: {}
    }

    return parseObjectToAST(paramString)
}