import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

import type { A } from './_imported'

export const result = reflect<A>()
export const expected = {
    kind: Kind.Interface,
    name: 'A',
    extends: [] as any[],
    members: [{
        name: "prop",
        type: { kind: Kind.String }
    },
    {
        name: "someClass",
        type: {
            kind: Kind.Class,
            name: "SecretClass",
            classReference: null,
            extends: [],
            implements: [],
            members: [
                { name: "name", type: { kind: Kind.String } }
            ],
            sourceFile: "_imported.ts",
            typeArguments: []
        }
    }]
}