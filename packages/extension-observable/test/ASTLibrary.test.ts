import {describe, expect, test} from 'vitest';
import esprima from 'esprima';
import {countArgs, defaultParams, findFirstMatchingNode, parseObjectToAST} from "../src/util/ASTLibrary.js";
import type {CallExpression, Literal, ObjectExpression, Property} from "estree";
import escodegen from "escodegen";

describe('ASTLibrary.ts', ()=> {
    test('countArgs()', ()=> {
        const oneArgAST = esprima.parseScript('num = engraft(this)')
        const twoArgAST = esprima.parseScript('num = engraft(this, {})')
        const failArgAST = esprima.parseScript('num = {}')

        expect(countArgs(oneArgAST)).toBe(1);
        expect(countArgs(twoArgAST)).toBe(2);
        expect(countArgs(failArgAST)).toBe(0);
    })

    describe('parseObjectToAST()', ()=> {
        test('general case', ()=> {
            // covered by findFirstMatchingNode() test
            const test = {a:10}
            const ast = parseObjectToAST(test);
            expect(ast.type).toMatch('ObjectExpression')
            const gen = escodegen.generate(ast, {format:{json:true}})
            expect(JSON.parse(gen)).toMatchObject(test)
        })

        test('error case', ()=> {
            expect(()=>parseObjectToAST('')).toThrowError()
        })
    })

    describe('findFirstMatchingNode()', ()=> {
        test('Basic Object Test', ()=> {
            const testObj = {
                "a" : 10,
                "b": 5
            }

            const str = `const a = ${JSON.stringify(testObj)}`
            const ast = esprima.parseScript(str);
            const res = findFirstMatchingNode(ast, 'ObjectExpression');
            expect(res).not.toBeNull();
            expect(res?.type).toMatch('ObjectExpression')
            const gen = JSON.parse(escodegen.generate(res, {
                format: {
                    json: true
                }
            }))

            expect(gen).toMatchObject(testObj)
        })

        test('Nested Object Test', ()=> {
            const testObj = {
                "a" : 10,
                "b": {
                    "c" : 10
                }
            }

            const str = `const a = ${JSON.stringify(testObj)}`
            const ast = esprima.parseScript(str);
            const res = findFirstMatchingNode(ast, 'ObjectExpression');
            expect(res).not.toBeNull();
            expect(res?.type).toMatch('ObjectExpression')
            const gen = JSON.parse(escodegen.generate(res, {
                format: {
                    json: true
                }
            }))
            // top level object contains 'a', instead of getting down into 'c'
            expect(gen).toHaveProperty('a')
        })

        test('Call Test', ()=> {
            const str = `const a = engraft(this)`
            const ast = esprima.parseScript(str);
            const res = findFirstMatchingNode(ast, 'CallExpression');
            expect(res).not.toBeNull();

            const expr = res as CallExpression
            expect(expr.type).toMatch('CallExpression')
            expect(expr.arguments.length).toBe(1)
        })

        test('Null Test', ()=> {
            const testObj = {
                "a" : 10,
                "b": 5
            }

            const str = `const a = ${JSON.stringify(testObj)}`
            const ast = esprima.parseScript(str);
            // trying to find a call expression in an object statement should return null
            const res = findFirstMatchingNode(ast, 'CallExpression');
            expect(res).toBeNull();
        })
    });

    describe('defaultParams()', ()=> {

        test('test fields', ()=> {
            const ast = defaultParams();
            expect(ast.type).toBe('ObjectExpression')
            const objExpr = ast as ObjectExpression

            const properties = objExpr.properties.map(item => {
                const property = item as Property
                return (property.key as Literal).value
            })
            // there should only be two fields, inputs and program
            expect(properties).toEqual(['inputs', 'program'])
        })
    })
})

