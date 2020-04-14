
describe("ts.TypeChecker", function() {
    this.timeout(15000)

    it('does not throw when called on various ts complex types', function() {
      require('./_fullchecker')
    });
});
