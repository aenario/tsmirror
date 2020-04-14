import 'reflect-metadata'
import { expect } from "chai";
import { graphql } from '../src/grahpql'
import { gql, ApolloServer } from 'apollo-server';


interface Jedi {
    name: string | null,
    fullyTrained: boolean
}

describe('graphql basic', function () {
    it('generates gql', () => {

        const jediStore: Jedi[] = []

        const resolvers = {
            Query: {
                jedis: (limit = 50): Jedi[] => jediStore.slice(0, limit),
                jediByName: (name: string): Jedi | undefined => jediStore.find((j) => j.name === name)
            },
            Mutation: {
                doStuff: (i: number): boolean => jediStore.length > i,
                createJedi: (j: Jedi): Jedi => { jediStore.push(j); return j }
            }
        }

        const { schema } = graphql(resolvers)
        const typeDefs = gql(schema);
        new ApolloServer({ resolvers, typeDefs });
        expect(schema).to.equal(
`input JediInput{
  name: String
  fullyTrained: Boolean!
}

type Jedi{
  name: String
  fullyTrained: Boolean!
}

type Mutation{
  doStuff(i: Float!): Boolean!
  createJedi(j: JediInput): Jedi
}

type Query{
  jedis(limit: Float! = 50): [Jedi!]!
  jediByName(name: String!): Jedi
}

schema{
  query: Query
  mutation: Mutation
}`)
    })

})
