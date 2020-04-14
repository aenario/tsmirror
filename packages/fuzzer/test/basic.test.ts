import 'reflect-metadata'
import { possibleValues, fuzzer } from '..'
import { expect } from 'chai'
import { reflect } from '@tsmirror/reflect'

enum MyEnum{
    A,
    B
}

interface MyInterface{
    enum: MyEnum,
    bool: boolean
}

describe('possibleValues', function() {

    it('works with union', () => {
        expect(possibleValues(reflect<'a'|1|false>())).to.have.members(['a', 1, false])
    })

    it('works with enum', () => {
        expect(possibleValues(reflect<MyEnum>())).to.deep.equal([MyEnum.A, MyEnum.B])
    })

    it('works with interface', () => {
        expect(possibleValues(reflect<MyInterface>())).to.have.deep.members([
            {enum: MyEnum.A, bool: true},
            {enum: MyEnum.B, bool: true},
            {enum: MyEnum.A, bool: false},
            {enum: MyEnum.B, bool: false}
        ])
    })

})

describe('fuzzer', function() {

    it('works', () => {
        const calls: any[][] = []
        fuzzer(function(i: MyInterface, e: MyEnum) {
            calls.push([i, e])
        })
        expect(calls).to.have.length(8)
    })

    it('give arguments when throwing', () => {
        expect(function(){
            fuzzer(function(i: MyInterface, e: MyEnum) {
                if(i.enum == e && i.bool == false) throw new Error('oups')
            })
        }).to.throw('with args [ { bool: false, enum: 0 }, 0 ]')
    })
})
