import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    prop: string
}

function A(this: I, other: I): string {
    return this.prop + other.prop
}

export const result = reflect(A)

export const interfaceType = reflect<I>()

export const expected = {
    kind: Kind.Function,
    name: 'A',
    signatures: [{
        parameters: [{
            name: "other",
            type: interfaceType
        }],
        thisType: interfaceType,
        returnType: { kind: Kind.String }
    }]
}