import estraverse from "estraverse";
import esprima from "esprima";
import estree, {CallExpression} from 'estree';


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

export function defaultParams() : estree.Expression  {
    const paramObj = {
        inputs: [],
        program: {}
    }

    return parseObjectToAST(paramObj) as estree.Expression
}