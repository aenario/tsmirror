import 'reflect-metadata'
import { expect } from "chai";
import { rootContainer, injectable } from '../src/'
import { reflected } from '@tsmirror/reflect'
import { Scope } from '../src/types';


interface Padawan {
    name: string,
    fullyTrained: false
}

interface Jedi {
    name: string,
    fullyTrained: true,
    darkSide: false
}

interface Sith {
    name: string,
    fullyTrained: true
    darkSide: true
}

// register yoda in the global handler
injectable(Scope.Resolution)(
    function yodaTraining(p: Padawan): Jedi {
        return { name: p.name, darkSide: false, fullyTrained: true }
    }
)

describe('functional API', function () {

    afterEach(() => { rootContainer.reset() })

    it('does not throw when creating not-yet-resolvable injectables', () => {
        injectable(Scope.Resolution)(
            function palpatineTraining(p: Padawan): Sith {
                return { name: p.name, darkSide: true, fullyTrained: true }
            }
        )
    })

    it('does throw when it cant resolve', () => {
        expect(function () {
            rootContainer.resolve(reflected((p: Jedi) => { console.log(p) }))
        }).to.throw()
    })

    it('returns a value when it resolve', () => {
        injectable(Scope.Resolution)(
            function yodaTraining(p: Padawan): Jedi {
                return { name: p.name, darkSide: false, fullyTrained: true }
            })
        injectable(Scope.Resolution)(
            function obiwanRecruiting(): Padawan {
                return {
                    name: "Luke", fullyTrained: false
                }
            })
        const result = rootContainer.resolve(reflected(function needHero(p: Jedi) {
            expect(p.name).to.equal('Luke')
            expect(p.fullyTrained).to.equal(true)
            return p.name
        }))
        expect(result).to.equal('Luke')
    })

    it('does throw if there are two factories for a type', () => {
        injectable(Scope.Resolution)(
            function obiwanRecruiting(): Padawan {
                return { name: "Luke", fullyTrained: false }
            })
        injectable(Scope.Resolution)(
            function anotherPadawan() : Padawan {
                return { name: 'Bob', fullyTrained: false }
            })

        expect(function () {
            rootContainer.resolve(reflected((p: Padawan) => { console.log(p) }))
        }).to.throw().with.property('message')
            .contains('(p)').contains('2')
    })

    it('does not throw if there are two factories for an arrayType', () => {
        injectable(Scope.Resolution)(
            function obiwanRecruiting(): Padawan {
                return { name: "Luke", fullyTrained: false }
            })
        injectable(Scope.Resolution)(
            function anotherPadawan(): Padawan {
                return { name: 'Bob', fullyTrained: false }
            })

        rootContainer.resolve(reflected(function startASchool(allPadawans: Padawan[]) {
            expect(allPadawans).to.have.length(2)
        }));
    })

})

describe('class API', function () {

    afterEach(() => { rootContainer.reset() })

    it('works', () => {

        interface I { prop: string }

        @injectable(Scope.Resolution)
        // @ts-ignore A unused
        class A implements I {
            prop: string
            constructor() { this.prop = 'hello'}
        }

        @injectable(Scope.Resolution)
        class B {
            otherprop: string
            constructor(a : I) {
                this.otherprop = a.prop
            }
        }

        rootContainer.resolve(reflected(function(b: B) {
            expect(b instanceof B).to.be.true
            expect(b).to.have.property('otherprop', 'hello')
        }))
    })

})
