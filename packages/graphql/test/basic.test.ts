import 'reflect-metadata'
import { expect } from "chai";
import { graphql } from '../src/grahpql'
import { reflected } from '@tsmirror/reflect'
import { gql, ApolloServer } from 'apollo-server';


interface Jedi {
    name: string | null,
    fullyTrained: boolean
}

describe('graphql basic', function () {
    it('generates gql', () => {

        const jediStore: Jedi[] = []
        const resolvers = reflected({
            Query: {
                jedis: (limit = 50): Jedi[] => jediStore.slice(0, limit),
                jediByName: (name: string): Jedi | undefined => jediStore.find((j) => j.name === name)
            },
            Mutation: {
                doStuff: (i: number): boolean => jediStore.length > i,
                createJedi: (j: Jedi): Jedi => { jediStore.push(j); return j}
            }
        })

        const { client, schema } = graphql(resolvers)
        console.log(schema, client)
        const typeDefs = gql(schema);
        expect(schema).to.not.be.null;
        new ApolloServer({ resolvers, typeDefs });

    })

})
