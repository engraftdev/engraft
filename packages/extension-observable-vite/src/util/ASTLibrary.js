import estraverse from "estraverse";

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

export const defaultParams = {
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

export function countArgs(ast) {
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