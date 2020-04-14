import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    prop: string
}

const A = (p: I): I => ({ prop: 'baz' + p.prop })

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
        returnType: interfaceType
    }]
}
export const expectedReadable='__function(p:I{prop:string}) => I{prop:string}'