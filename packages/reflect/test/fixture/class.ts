import { reflect, ReflectType, Kind } from '../../src/index'

interface I {
    sayHello(s: string): string
}

class B {
    otherprop: string
    constructor(otherprop: string) { this.otherprop = otherprop}
}

class A extends B implements I {
    myprop: string
    constructor(myprop: string) { super(myprop); this.myprop = myprop }
    sayHello(s: string): string { return 'hello ' + this.myprop + s }
}

export const result: ReflectType = reflect<A>()
export const expected: any = {
    kind: Kind.Class,
    name: 'A',
    classReference: A,
    typeArguments: [] as any[],
    extends: [reflect<B>()],
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
    },
    {
        name: "otherprop",
        type: { kind: Kind.String }
    }
    ]
}
export const expectedReadable = 'A{myprop:string, sayHello:sayHello(s:string) => string, otherprop:string}'