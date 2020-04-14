import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

enum A {
    v1,
    v2 = 7,
    v3
}

export const result = reflect<A>()
export const expected = {
    kind: Kind.Enum,
    name: 'A',
    names: ['v1', 'v2', 'v3'],
    values: [0, 7, 8]
}
export const expectedReadable = 'enum'