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