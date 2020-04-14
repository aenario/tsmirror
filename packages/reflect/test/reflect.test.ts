import { resolve, basename, extname } from "path";
import { expect } from "chai";
import {execSync} from "child_process";
import {readdirSync} from "fs"
import {isCompatible, humanReadable} from '../src/utils'
import "./fixture/circular"

const fixtureDir = resolve(__dirname, "fixture")

const cleanupCompileArtifacts = () => {
  execSync(`rm -rf ${fixtureDir}/*.js`)
  execSync(`rm -rf ${fixtureDir}/*.d.ts`)
}

describe("reflect", function() {

  this.timeout(5000);
  this.beforeAll(cleanupCompileArtifacts)
  this.afterEach(cleanupCompileArtifacts)

  readdirSync(fixtureDir)
  .map((name) => ({ tsFile: resolve(fixtureDir, name), ext: extname(name), name: basename(name, '.ts')}))
  .filter(({ext}) => ext === '.ts')
  .filter(({name}) => name[0] !== '_')
  .forEach(({tsFile, name}) => {
    it(name, function() {
      const {result, expected, expectedReadable, expectedSameRef} = require(tsFile) // see tsnoderegister.js

      expect(result).to.deep.equal(expected)

      // gutcheck: all types should be compatible with themselves
      expect(isCompatible(result, result))

      // gutcheck: humanReadable does not throw
      let readable = humanReadable(result)
      if(expectedReadable) expect(readable).to.equal(expectedReadable)
      if(expectedSameRef) expectedSameRef.forEach(([a, b] : [any, any]) => expect(a).to.equal(b))
    });
  })
});
