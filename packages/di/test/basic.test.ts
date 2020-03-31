import 'reflect-metadata'
import { expect } from "chai";
import { makeContainer } from '../src/container'
import { reflected } from '@tsmirror/reflect'


interface Padawan {
    name: string,
    isYoung: true,
    fullyTrained: false
}

interface Jedi {
    name: string,
    isYoung: false,
    fullyTrained: true
}

function yodaTraining(p: Padawan): Jedi {
    return {name: p.name, isYoung: false, fullyTrained: true}
}

let luke: Padawan = {name: 'Luke', isYoung: true, fullyTrained: false}
let ken: Padawan = {name: 'Ken', isYoung: true, fullyTrained: false}

describe('basic', function() {

    const di = makeContainer();

    it('does not throw on register with missing parameters', () => {
        di.register(reflected(yodaTraining))
    })

    it('does throw when it cant resolve', () => {
        expect(function(){
            di.get(reflected((p: Jedi) => { console.log(p) }))
        }).to.throw()
    })

    it('returns a value when it resolve', () => {
        di.register(reflected(() => luke))
        const result = di.get(reflected(function needHero(p: Jedi) {
            expect(p.name).to.equal('Luke')
            expect(p.fullyTrained).to.equal(true)
            return p.name
        }))
        expect(result).to.equal('Luke')
    })

    it('does throw if there are two factories for a type', () => {
        di.register(reflected(() => ken))
        expect(function(){
            di.get(reflected((p: Padawan) => { console.log(p) }))
        }).to.throw().with.property('message')
        .contains('( p )').contains('2')
    })

})
