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
            extends: [],
            implements: [],
            constructorSignatures: [{
                parameters: [{name: 'name', type: {kind: Kind.String}}],
                returnType: {},
            }],
            members: [
                { name: "name", type: { kind: Kind.String } }
            ],
            sourceFile: "_imported.ts",
            typeArguments: []
        }
    }]
}
// @ts-ignore
expected.members[1].type.constructorSignatures[0].returnType = expected.members[1].type