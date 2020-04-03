import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    prop: string
}
interface I2 { }

class A<T> {
    anyProp: any
    unknownProp: unknown
    stringProp: string
    numberProp: number
    booleanProp: boolean
    undefinedProp: undefined
    nullProp: null
    neverProp: never
    bigIntProp: bigint
    objectProp: { x: number, y: number }
    arrayProp: string[]
    interfaceProp: I
    unionProp: string | number | boolean
    tuppleProp: [string, number, boolean]
    intersectionProp: I & { otherProp: number }
    functionProp: (arg0: string) => number
    typedProp: T

    stringLiteralProp: "valueStringLiteral"
    numberLiteralProp: 42
    booleanLiteralProp: false
    bigIntLiteralProp: 666n

    somemethod(arg1: I, arg2: number): I { return { prop: arg1.prop + arg2 } }
    returnsVoid(msg: string): void { this.stringProp = msg; }
    reportsError(msg: string): never { throw new Error(msg); }
    takeFunction(mapper: (arg0: string) => number): number { return mapper(this.stringProp) }
    returnsNull(): null { return null }
    returnsUndefined(): undefined { return undefined }
}


const a = new A<I2>()
export const result = reflect(a)
export const expected: any = {
    kind: Kind.Class,
    name: "A",
    classReference: A,
    extends: [] as any[],
    implements: [] as any[],
    typeArguments: [] as any[],
    members: [
        { name: "anyProp", type: { kind: Kind.Any } },
        { name: "unknownProp", type: { kind: Kind.Unknown } },
        { name: "stringProp", type: { kind: Kind.String } },
        { name: "numberProp", type: { kind: Kind.Number } },
        { name: "booleanProp", type: { kind: Kind.Boolean } },
        { name: "undefinedProp", type: { kind: Kind.Undefined } },
        { name: "nullProp", type: { kind: Kind.Null } },
        { name: "neverProp", type: { kind: Kind.Never } },
        { name: "bigIntProp", type: { kind: Kind.BigInt } },
        {
            name: "objectProp", type: {
                kind: Kind.Interface, name: '', extends: [], members: [
                    { name: "x", type: { kind: Kind.Number } },
                    { name: "y", type: { kind: Kind.Number } },
                ]
            }
        },
        {
            name: "arrayProp",
            type: { kind: Kind.Reference, type: Array, typeArguments: [{ kind: Kind.String }] }
        },
        { name: "interfaceProp", type: reflect<I>() },
        {
            name: "unionProp", type: {
                kind: Kind.Union,
                types: [{ kind: Kind.String }, { kind: Kind.Number }, { kind: Kind.Boolean }]
            }
        },
        {
            name: "tuppleProp", type: {
                kind: Kind.Tuple,
                typeArguments: [{ kind: Kind.String }, { kind: Kind.Number }, { kind: Kind.Boolean }]
            }
        },
        {
            name: "intersectionProp", type: {
                kind: Kind.Intersection,
                types: [reflect<I>(), {
                    kind: Kind.Interface, name: '', extends: [], members: [{
                        name: 'otherProp', type: { kind: Kind.Number }
                    }]
                }]
            },
        },
        {
            name: "functionProp", type: {
                kind: Kind.Function, name: '',
                signatures: [{
                    parameters: [{ name: "arg0", type: { kind: Kind.String } } ],
                    returnType: { kind: Kind.Number }
                }]
            }
        },
        { name: "typedProp", type: reflect<I2>() },
        { name: "stringLiteralProp", type: { kind: Kind.StringLiteral, value: "valueStringLiteral" } },
        { name: "numberLiteralProp", type: { kind: Kind.NumberLiteral, value: 42 } },
        { name: "booleanLiteralProp", type: { kind: Kind.BooleanLiteral, value: false } },
        {
            name: "bigIntLiteralProp", type: {
                kind: Kind.BigIntLiteral, value: {
                    negative: false,
                    base10Value: '666'
                }
            }
        },
        {
            name: "somemethod", type: {
                kind: Kind.Method, name: "somemethod", signatures: [
                    {
                        parameters: [
                            { name: 'arg1', type: reflect<I>() },
                            { name: 'arg2', type: { kind: Kind.Number } },
                        ],
                        returnType: reflect<I>()
                    }
                ]
            }
        },
        {
            name: "returnsVoid", type: {
                kind: Kind.Method, name: "returnsVoid", signatures: [
                    {
                        parameters: [
                            { name: 'msg', type: { kind: Kind.String } },
                        ],
                        returnType: { kind: Kind.Void }
                    }
                ]
            }
        },
        {
            name: "reportsError", type: {
                kind: Kind.Method, name: "reportsError", signatures: [
                    {
                        parameters: [
                            { name: 'msg', type: { kind: Kind.String } },
                        ],
                        returnType: { kind: Kind.Never }
                    }
                ]
            }
        },
        {
            name: "takeFunction", type: {
                kind: Kind.Method, name: "takeFunction", signatures: [
                    {
                        parameters: [ {name: 'mapper', type: {kind: Kind.Function, name: '', signatures: [
                            {
                                parameters: [{ name: 'arg0', type: { kind: Kind.String } }],
                                returnType: { kind: Kind.Number }
                            }
                        ]}}],
                        returnType: { kind: Kind.Number }
                    }
                ]
            }
        },
        {
            name: "returnsNull", type: {
                kind: Kind.Method, name: "returnsNull", signatures: [
                    {
                        parameters: [],
                        returnType: { kind: Kind.Null }
                    }
                ]
            }
        },
        {
            name: "returnsUndefined", type: {
                kind: Kind.Method, name: "returnsUndefined", signatures: [
                    {
                        parameters: [],
                        returnType: { kind: Kind.Undefined }
                    }
                ]
            }
        },

    ]
}