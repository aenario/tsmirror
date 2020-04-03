// import { expect } from "chai";
// import {execSync} from "child_process";
// import {readdirSync} from "fs"
// import {isCompatible, humanReadable} from '../src/utils'
import { reflect } from "../src";
import * as ts from 'typescript'

describe("reflect ts.TypeChecker", function() {
    this.timeout(15000)

    it('does not throw when called on various ts complex types', function() {
      reflect<ts.TypeChecker>()
      reflect<ts.Program>()
      reflect<ts.CompilerHost>()
      reflect<Node>() // DOM Node
      reflect<ArrayBuffer>()
      reflect<Promise<Response>>()
    });
});
