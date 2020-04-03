import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface A {
    prop: string
}

export const result = reflect<A>()
export const expected = {
    kind: Kind.Interface,
    name: 'A',
    extends: [] as any[],
    members: [{
        name: "prop",
        type: { kind: Kind.String }
    }]
}