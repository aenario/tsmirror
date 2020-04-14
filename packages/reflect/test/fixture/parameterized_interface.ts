import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface A<T, U> {
    first: T;
    second: U;
}

export const result = reflect<A<string, number>>()

export const expected = {
    kind: Kind.Interface,
    name: 'A',
    extends: [] as any[],
    members: [
        {
            name: "first",
            type: { kind: Kind.String }
        },
        {
            name: "second",
            type: { kind: Kind.Number }
        }
    ]
}
export const expectedReadable = 'A{first:string, second:number}'