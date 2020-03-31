import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

type A = "hello" | "world" | true | 7

export const result = reflect<A>()
export const expected = {
    kind: Kind.Union,
    types: [
        { kind: Kind.BooleanLiteral, value: true },
        { kind: Kind.StringLiteral, value: "hello" },
        { kind: Kind.StringLiteral, value: "world" },
        { kind: Kind.NumberLiteral, value: 7 }]
}