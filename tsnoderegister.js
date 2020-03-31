// register ts-node with the reflect transformer
// used by tests in @tsmirror/* packages
const transformer = require("./packages/reflect/lib/transformer").default;

require("ts-node").register({
  transformers: program => {
    return {
      before: [transformer(program)]
    };
  }
});
