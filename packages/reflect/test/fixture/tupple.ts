import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

type A = [string, number, number]

export const result = reflect<A>()
export const expected = {
    kind: Kind.Tuple,
    typeArguments: [
        { kind: Kind.String },
        { kind: Kind.Number },
        { kind: Kind.Number },
    ]
}