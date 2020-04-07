import { reflect } from '../../src/index'
import { Kind } from '../../src/type'

interface I {
    sayHello(s: string): string
}

class A implements I {
    myprop: string
    constructor(myprop: string) { this.myprop = myprop }
    sayHello(s: string): string { return 'hello ' + this.myprop + s }
}

const a = new A('zip');

export const result = reflect(a)
export const expected = {
    kind: Kind.Class,
    name: 'A',
    classReference: A,
    typeArguments: [] as any[],
    extends: [] as any[],
    implements: [reflect<I>()],
    constructorSignatures: [{
        parameters: [{name: 'myprop', type: {kind: Kind.String}}],
        returnType: result,
    }],
    members: [{
        name: "myprop",
        type: { kind: Kind.String }
    },
    {
        name: "sayHello",
        type: {
            kind: Kind.Method,
            name: "sayHello",
            signatures: [{
                parameters: [{
                    name: 's',
                    type: { kind: Kind.String }
                }],
                returnType: { kind: Kind.String }
            }]
        }
    }
    ]
}