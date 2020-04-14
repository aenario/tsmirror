import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

interface I {
    prop: string
}
/* ts included
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
}
*/

export const result = reflect<Readonly<I>>()
export const expected = {
    kind: Kind.Interface,
    name: "",
    extends: [] as any[],
    members: [
        {
            name: 'prop',
            type: { kind: Kind.Any } // @TODO why ???
        }
    ]
}
export const expectedReadable = '{prop:any}'