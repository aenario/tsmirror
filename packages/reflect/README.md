# `@tsmirror/reflect`

A Typescript transformer to include compiler types into the compiled code.

# Requirement

TypeScript >= 2.4.1

# How to use this package

This package is a type script **transformer**.

## Why ?

Typescript alread has some support for metadata reflection at https://www.typescriptlang.org/docs/handbook/decorators.html#metadata but :

1. It is tightly linked to decorators, preventing its usage with a free floating function
2. It serialize Typescript's types in a way that loose a lot of information (everything is `Object`)

This package instead emits as much information as possible in a serializable format.

Here is a list of some cool usage for the ReflectType object.

- Casting and checking: you can use the ReflectType to validate user input.
- Tokenless Dependency Injection: see the @tsmirror/di package
- Configurationless Fuzz-testing: see the @tsmirror/fuzzer package
- Graphql générations from function's types: see the @tsmirror/graphql package

## How to use `reflect`

```ts
import { reflect, ReflectType } from '@tsmirror/reflect';

interface MyInterface {
  id: string;
  name: string;
  age: number;
}

let value : MyInterface = {id: '1', name: 'hello', age: 42}

const myinterfaceType: ReflectType = reflect<MyInterface>();
// or
const myinterfaceType: ReflectType = reflect(value);

console.log(myinterfaceType);
/* {
    kind: "interface",
    name: 'MyInterface',
    members: [
        { name: "id", type: { kind: "string" } },
        { name: "name", type: { kind: "string" } },
        { name: "age", type: { kind: "number" } },
    ]
} */
```

## How to use `reflected`/`getTypeOf`

The reflect function can only be called at a spot where the typescript
compiler knows the type of the object, so this wont work :

```ts
function logType(arg: any) {
  console.log(reflect(arg)); // will only log {kind: Any}
}

logType(value);
```


To sidestep this issue, you can use the `reflected`/`getTypeOf` combo

```ts
import { reflected, getTypeOf } from "@tsmirror/reflect";
import "reflect-metadata";

value = reflected(value);

function logType(arg: any) {
  console.log(getTypeOf(arg)); // full ReflectType
}

logType(value);
```

The reflect type will be stored in the object's metadata using the [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) package.


## How to use the `reflecting` function

While more hacky, the `reflecting` function allows a package to expose a clean API to their user.
It is used in all other packages from the @tsmirror organisation.

```ts

const _logType = (rtype: ReflectType) => (arg: any) => console.log(arg, 'has type', rtype)
const logType = reflecting(_logType) // logType: Reflecting<(arg: any) => void>

logType(value)
/* {id: '1', name: 'hello', age: 42} has type {
    kind: "interface",
    name: 'MyInterface',
    members: [...] } */
```

## How to use the custom transformer

Unfortunately, TypeScript itself does not currently provide any easy way to use custom transformers (See https://github.com/Microsoft/TypeScript/issues/14419).

See [https://github.com/madou/typescript-transformer-handbook/#consuming-transformers](Madou's transformer handbook) for how you can use them with various compilers and bundlers.

# Note

- The `reflect` function will only be compiled out as a call expression. ie. `reflect.toString()` will output the stub function's definition.

# License

MIT
