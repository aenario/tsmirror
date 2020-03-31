import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

import type { A } from './_imported'

export const result = reflect<A>()
export const expected = {
    kind: Kind.Interface,
    name: 'A',
    members: [{
        name: "prop",
        type: { kind: Kind.String }
    }]
}