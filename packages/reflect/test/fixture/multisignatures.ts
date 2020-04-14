import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

function A(a: string): string
function A(a: number): string
function A(a: any): string {
    return a.toString();
}

export const result = reflect(A)

export const expected = {
    kind: Kind.Function,
    name: 'A',
    signatures: [{
        parameters: [{
            name: "a",
            type: { kind: Kind.String }
        }],
        returnType: { kind: Kind.String }
    }, {
        parameters: [{
            name: "a",
            type: { kind: Kind.Number }
        }],
        returnType: { kind: Kind.String }
    }]
}
export const expectedReadable = 'A(a:string) => string +1signatures'