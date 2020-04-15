import 'reflect-metadata'
import { expect } from "chai";
import { rootContainer, injectable, resolve, singleton, containerSingleton } from '../src/'


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
injectable(
    function yodaTraining(p: Padawan): Jedi {
        return { name: p.name, darkSide: false, fullyTrained: true }
    }
)

describe('functional API', function () {

    afterEach(() => { rootContainer.reset() })

    it('does not throw when creating not-yet-resolvable injectables', () => {
        injectable(
            function palpatineTraining(p: Padawan): Sith {
                return { name: p.name, darkSide: true, fullyTrained: true }
            }
        )
    })

    it('does throw when it cant resolve', () => {
        expect(function () {
            resolve((p: Jedi) => { console.log(p) })
        }).to.throw()
    })

    it('returns a value when it resolve', () => {
        injectable(
            function yodaTraining(p: Padawan): Jedi {
                return { name: p.name, darkSide: false, fullyTrained: true }
            })
        injectable(
            function obiwanRecruiting(): Padawan {
                return {
                    name: "Luke", fullyTrained: false
                }
            })
        const result = resolve(function needHero(p: Jedi) {
            expect(p.name).to.equal('Luke')
            expect(p.fullyTrained).to.equal(true)
            return p.name
        })
        expect(result).to.equal('Luke')
    })

    it('does throw if there are two factories for a type', () => {
        injectable(
            function obiwanRecruiting(): Padawan {
                return { name: "Luke", fullyTrained: false }
            })
        injectable(
            function anotherPadawan() : Padawan {
                return { name: 'Bob', fullyTrained: false }
            })

        expect(function () {
            resolve((p: Padawan) => { console.log(p) })
        }).to.throw().with.property('message')
            .contains('(p)').contains('2')
    })

    it('does not throw if there are two factories for an arrayType', () => {
        injectable(
            function obiwanRecruiting(): Padawan {
                return { name: "Luke", fullyTrained: false }
            })
        injectable(
            function anotherPadawan(): Padawan {
                return { name: 'Bob', fullyTrained: false }
            })

        resolve(function startASchool(allPadawans: Padawan[]) {
            expect(allPadawans).to.have.length(2)
        })
    })

    it('Creates only new instances for Scope.Resolution', () => {
        let callsCount = 0
        injectable(
            function obiwanRecruiting(): Padawan {
                callsCount++
                return { name: "Luke", fullyTrained: false }
            })

        let a = resolve((p: Padawan) => p)
        let b = resolve((p: Padawan) => p)
        expect(a).to.not.equal(b)
        expect(callsCount).to.equal(2)
    })

    it('Reuse objects with Scope.Singleton', () => {
        let callsCount = 0
        singleton(
            function obiwanRecruiting(): Padawan {
                callsCount++
                return { name: "Luke", fullyTrained: false }
            })

        let a = resolve((p: Padawan) => p)
        let b = resolve((p: Padawan) => p)
        expect(a).to.equal(b)
        expect(callsCount).to.equal(1)
    })

    it('Reuse objects with Scope.ContainerSingleton', () => {
        let callsCount = 0
        singleton(
            function obiwanRecruiting(): Padawan {
                callsCount++
                return { name: "Luke", fullyTrained: false }
            })

        let a = resolve((p: Padawan) => p)
        let b = resolve((p: Padawan) => p)
        expect(a).to.equal(b)
        expect(callsCount).to.equal(1)
    })

})

describe('child containers', function () {

    let child = rootContainer.child()
    afterEach(() => { rootContainer.reset() })
    beforeEach(() => {child = rootContainer.child()})

    it('a child container can get a value from its parent', () => {
        injectable(function obiwanRecruiting(): Padawan {
            return { name: "Luke", fullyTrained: false }
        })

        child.resolve((p: Padawan) => {
            expect(p).to.have.property('name', 'Luke')
        })
    })

    it('a child container can use a parent transform', () => {
        interface A {prop: string}
        interface B {prop: number}
        injectable(function AtoB(a: A): B {
            return { prop: a.prop.length }
        })

        child.injectable(function makeA(): A {
            return {prop: 'hello'}
        })

        child.resolve((b: B) => {
            expect(b).to.have.property('prop', 5)
        })
    })

    it('a child container will prefer its own transform', () => {
        interface A {prop: string}

        rootContainer.injectable(function makeAfromParent(): A {
            throw new Error('this should not be called')
        })

        child.injectable(function makeA(): A {
            return {prop: 'hello'}
        })

        child.resolve((a: A) => {
            expect(a).to.have.property('prop', 'hello')
        })
    })

    it('a child container will get parents when resolving array argument', () => {
        interface A {prop: string}

        rootContainer.injectable(function makeAfromParent(): A {
            return {prop: 'world'}
        })

        child.injectable(function makeA(): A {
            return {prop: 'hello'}
        })

        child.resolve((a: A[]) => {
            expect(a).to.have.length(2)
            expect(a.find(({prop}) => prop === 'hello')).to.not.be.undefined
            expect(a.find(({prop}) => prop === 'world')).to.not.be.undefined
        })
    })

    it('ContainerSingleton scoped instance do not contaminate parent', () => {
        interface A {prop: string}
        interface B {prop: number}
        const otherChild = rootContainer.child()

        rootContainer.containerSingleton(function AtoB(a: A): B {
            return {prop: a.prop.length}
        })

        child.injectable(function makeA(): A {
            return {prop: 'hello'}
        })

        otherChild.injectable(function makeOtherA(): A {
            return {prop: 'foo'}
        })

        let firstB = child.resolve((b: B) => {
            expect(b).to.have.property('prop', 5)
            return b
        })
        otherChild.resolve((b: B) => {
            expect(b).to.have.property('prop', 3)
        })
        let secondB = child.resolve((b: B) => {
            expect(b).to.have.property('prop', 5)
            return b
        })
        expect(firstB).to.equal(secondB)
    })

    it('Singleton scoped instance are shared across children', () => {
        interface A {prop: string}
        const otherChild = rootContainer.child()
        let callsCount = 0

        rootContainer.singleton(function makeA(): A {
            callsCount++
            return {prop: 'hello'}
        })

        let firstA = child.resolve((a: A) => {
            expect(a).to.have.property('prop', 'hello')
            return a
        })
        let secondA = otherChild.resolve((a: A) => {
            expect(a).to.have.property('prop', 'hello')
            return a
        })
        expect(callsCount).to.equal(1)
        expect(firstA).to.equal(secondA)
    })

})

describe('class API', function () {

    afterEach(() => { rootContainer.reset() })

    it('can use a class\'s constructor as a factory', () => {

        interface I { prop: string }
        let child = rootContainer.child()
        let otherChild = rootContainer.child()

        @injectable
        // @ts-ignore A unused
        class A implements I {
            prop: string
            constructor() { this.prop = 'hello'}
        }

        @injectable
        class B {
            otherprop: string
            constructor(a : I) {
                this.otherprop = a.prop
            }
        }

        @singleton
        class C{
            cprop: string
            constructor(c: I) { this.cprop = c.prop}
        }

        @containerSingleton
        class D{
            dprop: string
            constructor(a: I) { this.dprop = a.prop}
        }

        expect(resolve(function(b: B) {
            expect(b instanceof B).to.be.true
            expect(b).to.have.property('otherprop', 'hello')
            return b
        })).to.not.equal(resolve((b: B) =>b))

        child.resolve(function(d: D) {
            expect(d instanceof D).to.be.true
            expect(d).to.have.property('dprop', 'hello')
        })
        expect(child.resolve((c: C) => c)).to.equal(child.resolve((c: C) => c))
        expect(child.resolve((d: D) => d)).to.equal(child.resolve((d: D) => d))
        expect(child.resolve((c: C) => c)).to.equal(otherChild.resolve((c: C) => c))
        expect(child.resolve((d: D) => d)).to.not.equal(otherChild.resolve((d: D) => d))
    })

})
