import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

function A<T>(a: T): T {
    return a
}

export const result = reflect(A)

export const expected = {
    kind: Kind.Function,
    name: 'A',
    signatures: [{
        parameters: [{
            name: "a",
            type: { kind: Kind.TypeParameter, name: 'T' }
        }],
        returnType: { kind: Kind.TypeParameter, name: 'T' }
    }]
}
export const expectedReadable = 'A(a:<T>) => <T>'
export const expectedSameRef = [[result.signatures[0].parameters[0].type, result.signatures[0].returnType]]