import 'reflect-metadata'
import { expect } from "chai";
import { Kind, REFLECT_TYPE, getTypeOf } from "../src/index";

describe("reflected", function () {

    this.timeout(5000);

    it('reflected', function () {
        const { result } = require('./_reflected')
        const metadata = Reflect.getMetadata(REFLECT_TYPE, result)

        // const a in _reflected.ts
        expect(result).to.deep.equal({ prop: 'hello' })

        expect(metadata).to.deep.equal({
            kind: Kind.Interface,
            extends: [] as any[],
            name: 'A',
            members: [{
                name: "prop",
                type: { kind: Kind.String }
            }]
        })

        expect(getTypeOf(result)).to.equal(metadata)
    });
});
