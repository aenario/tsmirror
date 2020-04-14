import { expect } from "chai";

describe("reflecting", function() {
    this.timeout(15000)

    it('works', function() {
      const {result} = require('./_reflecting')
      expect(result).to.be.true
    });
});
