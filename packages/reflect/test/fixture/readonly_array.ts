import { reflect } from '../../src/index'
import { Kind } from "../../src/type";

interface I {prop: string}

interface MyArray<T> extends ReadonlyArray<T> {
    extraArrayProp: boolean
}

export const result = reflect<MyArray<I>>()
export const expected = {
    kind: Kind.Interface,
    name: "MyArray",
    extends: [{
        kind: Kind.Reference,
        type: Array,
        typeArguments: [reflect<I>()]
    }],
    members: [{
        name: 'extraArrayProp',
        type: {kind: Kind.Boolean}
    }]
}
// TODO: this is not great
export const expectedReadable = 'MyArray{extraArrayProp:boolean}'