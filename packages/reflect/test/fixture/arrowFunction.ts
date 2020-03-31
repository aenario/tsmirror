import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    prop: string
}

let A = (p: I) => {
    console.log(p)
}

export const result = reflect(A)

export const interfaceType = reflect<I>()

export const expected = {
    kind: Kind.Function,
    name: '__function',
    signatures: [{
        parameters: [{
            name: "p",
            type: interfaceType
        }],
        returnType: {kind: Kind.Void}
    }]
}