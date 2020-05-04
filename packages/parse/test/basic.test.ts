import 'reflect-metadata'
import { expect } from "chai";
import { parse } from '../lib'


enum MyEnum {
  A,
  B
}

enum MyStringEnum {
  A = "A",
  B = "B"
}

interface MyInterface {
  type: "FixedString"
  parent: MyInterface | null,
  name: string,
  somebool: boolean,
  somenumber?: number
  someenum?: MyEnum,
  somestringenum?: MyStringEnum
}

let jediJson = `
{
    "type":"FixedString",
    "parent": {
        "type":"FixedString",
        "name": "Obiwan",
        "somebool": true
    },
    "name": "Luke",
    "somebool": false,
    "somenumber": 42,
    "someenum": 0,
    "somestringenum": "A"
}
`

let notJediJson = `
{
  "type":"NotRight"
}
`


describe('parse', function () {
  it('works with correct json', () => {
    const j = parse<MyInterface>(jediJson)
    expect(j.ok == false && j.reason).to.be.false
    expect(j.ok == true && j.value.parent && j.value.parent.name).to.equal("Obiwan")
  })

  it('gives error for other json', () => {
    const j = parse<MyInterface>(notJediJson)
    expect(j.ok == false && j.reason).to.contain('NotRight').and.to.contain('property type')
  })

})
