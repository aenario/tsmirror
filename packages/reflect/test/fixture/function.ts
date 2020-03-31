import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    prop: string
}

function A(p: I, d: string = 'hello', ...rest: string[]): I {
    return { prop: 'baz' + d + p.prop + rest.join('|') }
}

export const result = reflect<typeof A>()

export const interfaceType = reflect<I>()

export const expected = {
    kind: Kind.Function,
    name: 'A',
    signatures: [{
        parameters: [{
            name: "p",
            type: interfaceType
        },
        {
            name: "d",
            type: {kind: Kind.String},
            default: {kind: Kind.StringLiteral, value: 'hello'}
        },
        {
            name: "rest",
            type: {kind: Kind.Reference, type: Array, typeArguments: [{kind: Kind.String}]},
            rest: true
        }],
        returnType: interfaceType
    }]
}