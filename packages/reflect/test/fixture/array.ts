import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

var A: string[] = []

export const result = reflect(A)
export const expected = {
    kind: Kind.Reference,
    type: Array,
    typeArguments: [{ kind: Kind.String }]
}
export const expectedReadable = 'Array<string>'