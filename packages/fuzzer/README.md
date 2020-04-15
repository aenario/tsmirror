# `fuzzer`

Toy fuzzer that calls a function with every possible arguments.

## Usage

```ts
import { reflected } from "@tsmirror/reflect";
import fuzzer from "@tsmirror/fuzzer";
import assert from "assert";

fuzzer((x: string, y: string, z: string) => {
    assert([x, y, z].concat("") === x + y + z, "Unexpected Array.concat behaviour");
})
```

## Note

- For string, it uses the `minimaxir/big-list-of-naughty-strings`
- For numbers, it uses a variety of edge case (0, -1, Infinity, ...)
- Enums are tested with all values
- Object, Interface, Tupple, Union are the cartesian products of their member's possible values.
- Other types are not yet handled