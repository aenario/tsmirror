# `@tsmirror/graphql`

Generate graphql from typescript types.

## Usage

```ts
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
```
