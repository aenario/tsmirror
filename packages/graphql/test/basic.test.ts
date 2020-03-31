import 'reflect-metadata'
import { expect } from "chai";
import { graphql } from '../src/grahpql'
import { reflected } from '@tsmirror/reflect'


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

describe('basic', function() {
    it('generates gql', () => {

        const {client, schema} = graphql(reflected(APIDefinition))
        expect(schema).to.not.be.null;
        console.log(schema, client)

    })

})
