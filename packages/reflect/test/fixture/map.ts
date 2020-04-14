import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

var A: Map<string, number> = new Map();

export const result = reflect(A)
export const expected = {
    kind: Kind.Reference,
    type: Map,
    typeArguments: [{ kind: Kind.String }, { kind: Kind.Number }]
}
export const expectedReadable = 'Map<string, number>'