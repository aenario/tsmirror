# @tsmirror

This is a monorepo for the @tsmirror npm organisation's packages.

The goal of this organisation is to explore the possibilities of full reflection
in typescript.

## Why ?

Typescript alread has some support for metadata reflection at https://www.typescriptlang.org/docs/handbook/decorators.html#metadata but :

1. It is tightly linked to decorators, preventing its usage with a free floating function
2. It serialize Typescript's types in a way that loose a lot of information (everything is `Object`)

This package instead emits as much information as possible in a serializable format.

## Main package

- [@tsmirror/reflect](https://github.com/aenario/tsmirror/tree/master/packages/reflect) is the base package which allow to get a runtime representation of
typescript's types. (named ReflectType)

```ts
import { reflect, ReflectType } from '@tsmirror/reflect';

interface MyInterface {
  id: string;
  name: string;
  age: number;
}

const myInterfaceType: ReflectType = reflect<MyInterface>();
console.log(myInterfaceType);
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

## Other packages

There is also some other packages wich use the ReflectType object for various purposes.

### [@tsmirror/di](https://github.com/aenario/tsmirror/tree/master/packages/di) a toy Dependency injection container

```ts
import { reflected } from '@tsmirror/reflect'
import { makeContainer } from '@tsmirror/di'

const di = makeContainer()
di.register(reflected(configProvider))
di.register(reflected((c: Config): MyInterface => makeStuff(c)))
di.get(reflected((m: MyInterface) => alert(m.name)))
```

## [@tsmirror/fuzzer](https://github.com/aenario/tsmirror/tree/master/packages/fuzzer) a basic fuzzer
```ts
import { reflected } from "@tsmirror/reflect"
import fuzzer from "@tsmirror/fuzzer"
import assert from "assert"

fuzzer(
  reflected((x: string, y: number, z: string) => {
    assert([x, y, z].concat("") === x + y + z, "Unexpected Array.concat behaviour")
  })
)
```

## [@tsmirror/graphql](https://github.com/aenario/tsmirror/tree/master/packages/graphql) a basic graphql generator
```ts
import { reflected } from '@tsmirror/reflect'
import { graphql } from '@tsmirror/graphql'

interface Jedi {
    master: Jedi,
    name: string | null,
    fullyTrained: boolean
}

const APIDefinition = {
    queries: {
        jedis: (limit = 50): Jedi[] => limit > 10 ? []:[]
    },
    mutations: {
        createJedi: (j: Jedi) => j
    }
}
const {client, schema} = graphql(reflected(APIDefinition))
console.log(schema)
/*
input JediInput{
  master: JediInput
  name: String
  fullyTrained: Boolean
}
type Jedi{
  master: Jedi
  name: String
  fullyTrained: Boolean
}
type Mutation{
  createJedi(j: JediInput): Jedi
}
type Query{
  jedis(limit: Float = 50): [Jedi!]
}
schema{
  query: Query
  mutation: Mutation
}*/
```