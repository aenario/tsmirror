import { reflect, ReflectType, Kind } from '../../src/index'

interface I {
    sayHello(s: string): string
}

class A implements I {
    myprop: string
    constructor(myprop: string) { this.myprop = myprop }
    sayHello(s: string): string { return 'hello ' + this.myprop + s }
}

const a = new A('zip');

export const result: ReflectType = reflect(a)
export const expected: any = {
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
            kind: Kind.Function,
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
export const expectedReadable = 'A{myprop:string, sayHello:sayHello(s:string) => string}'