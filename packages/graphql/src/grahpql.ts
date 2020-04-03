import 'reflect-metadata'
import { ReflectType, Kind, NameAndType } from '@tsmirror/reflect'
import { getTypeOf, humanReadable } from '@tsmirror/reflect'

interface GraphqlAPIDefinition {
    queries: { [name: string]: Function }
    mutations: { [name: string]: Function }
}

// TODO: circularHandler
export function graphql(def: GraphqlAPIDefinition): { client: any, schema: string } {

    const rt: ReflectType | null = getTypeOf(def)
    if (rt == null) throw new Error('the api definition have not been reflected') 
    if (rt.kind != Kind.Interface) throw new Error('bad graphql argument')

    const members: NameAndType[] = rt.members
    const queriesNT = members.find(({ name }) => name === 'queries') 
    if (!queriesNT || queriesNT.type.kind != Kind.Interface) throw new Error('bad graphql queries argument')

    const mutationsNT = members.find(({ name }) => name === 'mutations') 
    if (!mutationsNT || mutationsNT.type.kind != Kind.Interface) throw new Error('bad graphql mutations argument')

    const queries = queriesNT.type
    const mutations = mutationsNT.type

    const nameCounter = 0
    const inputTypes = new Map<ReflectType, string>()
    const outputTypes = new Map<ReflectType, string>()

    const getName = (t: ReflectType, forInput: boolean, nonNull: boolean = false): string => {

        const maybeBang = nonNull ? '!' : ''

        switch (t.kind) {
            case Kind.String: return 'String' + maybeBang
            case Kind.Number: return 'Float|Int' + maybeBang
            case Kind.Boolean: return 'Boolean' + maybeBang
            case Kind.BigInt: return 'Int' + maybeBang

            case Kind.NumberLiteral: return t.value.toString()
            case Kind.StringLiteral:
            case Kind.BooleanLiteral:
            case Kind.BigIntLiteral:
                return JSON.stringify(t.value)

            // TODO test me
            case Kind.EnumLiteral:
                return t.valueName
            case Kind.Enum:
                return t.name

            case Kind.Reference:
                if (t.type === Array) return '[' + getName(t.typeArguments[0], forInput) + '!]' + maybeBang
                else throw new Error('not implemented yet graphql for ' + humanReadable(t))

            case Kind.Union:
                if (t.types.length === 2 && t.types[1].kind === Kind.Null) return getName(t.types[0], forInput, true)
                if (t.types.length === 2 && t.types[0].kind === Kind.Null) return getName(t.types[1], forInput, true)
                else throw new Error('not implemented yet graphql for ' + humanReadable(t))

            case Kind.Any:
            case Kind.Unknown:
            case Kind.Void:
            case Kind.Undefined:
            case Kind.Null:
            case Kind.Never:
            case Kind.Intersection:
            case Kind.Function:
            case Kind.Method:
            case Kind.Tuple:
            case Kind.TypeParameter:
            case Kind.ESSymbol:
                throw new Error('not implemented yet graphql for ' + humanReadable(t))
        }

        let lookup = forInput ? inputTypes : outputTypes

        // @ts-ignore
        let name = (t.name ? t.name : ('Anonymous' + (nameCounter++))) + (forInput ? 'Input' : '')

        if (!lookup.has(t)) {
            lookup.set(t, name )
        }
        return name
    }

    const graphqlParameter = ({ name, type, default: def }: NameAndType) => {
        return name + ': ' + getName(type, true) + (def ? (' = ' + getName(def, true)) : '')
    }

    const grapqlObject = (t: ReflectType, name: string, forInput: boolean): string => {
        switch (t.kind) {
            case Kind.Object:
            case Kind.Interface:
            case Kind.Class:
                return (forInput ? 'input' : 'type') + ' ' + name + '{\n  '
                    + t.members.map(({name, type}) => name + ': ' + getName(type, forInput)).join('\n  ')
                    + '\n}'

            default:
                throw new Error('not implemented yet, defining type ' + humanReadable(t))
        }
    }

    const queryBlock = 'type Query{\n' +
        queries.members.map(({ name: queryName, type }) => {
            if (type.kind != Kind.Function) throw new Error('bad graphql queries.' + name + ' argument')
            return '  ' + queryName + '(' +
                type.signatures[0].parameters.map(graphqlParameter).join(', ')
                + '): ' + getName(type.signatures[0].returnType, false)
        }).join('\n') + '\n}'

    const mutationBlock = 'type Mutation{\n' +
        mutations.members.map(({ name: mutationName, type }) => {
            if (type.kind != Kind.Function) throw new Error('bad graphql mutations.' + name + ' argument')
            return '  ' + mutationName + '(' +
                type.signatures[0].parameters.map(graphqlParameter).join(', ')
                + '): ' + getName(type.signatures[0].returnType, false)
        }).join('\n') + '\n}'

    const inputBlocks = Array.from(inputTypes.entries()).map(([t, name]) => grapqlObject(t, name, true)).join('\n\n')
    const outputBlocks = Array.from(outputTypes.entries()).map(([t, name]) => grapqlObject(t, name, false)).join('\n\n')

    const schemaBlock = 'schema{\n  query: Query, mutation: Mutation\n}'

    const schema = [inputBlocks, outputBlocks, mutationBlock, queryBlock, schemaBlock].join('\n\n')

    return { client: null, schema }
}