import 'reflect-metadata'
import { resolve } from "path";
import { expect } from "chai";
import { execSync } from "child_process";
import { Kind, REFLECT_TYPE, getTypeOf } from "../src/index";

const fixtureDir = resolve(__dirname, "fixture")

const cleanupCompileArtifacts = () => {
    execSync(`rm -rf ${fixtureDir}/*.js`)
    execSync(`rm -rf ${fixtureDir}/*.d.ts`)
}

describe("reflected", function () {

    this.timeout(5000);
    this.beforeAll(cleanupCompileArtifacts)
    this.afterEach(cleanupCompileArtifacts)

    it('reflected', function () {
        const { result } = require(fixtureDir + '/_reflected')
        const metadata = Reflect.getMetadata(REFLECT_TYPE, result)

        // const a in _reflected.ts
        expect(result).to.deep.equal({ prop: 'hello' })

        expect(metadata).to.deep.equal({
            kind: Kind.Interface,
            name: 'A',
            members: [{
                name: "prop",
                type: { kind: Kind.String }
            }]
        })

        expect(getTypeOf(result)).to.equal(metadata)
    });
});
