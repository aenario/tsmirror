# `@tsmirror/parse`

Parse json objects into typescript interface

## Usage

```ts
interface Jedi {
    master: Jedi | null,
    name: string,
    fullyTrained: boolean
}

let jediJson = `
    {
        "master": {
            "name": Obiwan,
            "fullyTrained": true
        },
        "name": "Luke"
        "fullyTrained": false
    }
`

const j: Jedi = parse<Jedi>(jediJson)
```


