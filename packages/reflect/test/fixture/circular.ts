import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface Folder {
    parent: Folder
    name: string
}

export const result = reflect<Folder>()
export let expected = {
    kind: Kind.Interface,
    name: 'Folder',
    extends: [] as any[],
    members: [{
        name: "parent",
        type: result
    }, {
        name: "name",
        type: { kind: Kind.String }
    }]
}
export const expectedReadable = 'Folder{parent:[Circular Folder], name:string}'
// @ts-ignore
export const expectedSameRef = [[result, result.members[0].type]]