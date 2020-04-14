import { ReflectType, Kind, REFLECT_TYPE, ReflectTypeOf } from './type'
import { Y, circularHandler } from './circular'

// TODO: complete signatures
export function getTypeOf<T extends any>(x: T): ReflectTypeOf<T> | null {
    let type: ReflectType | null = null
    // @ts-ignore
    if (typeof Reflect === "object" && typeof Reflect.getMetadata === "function") {
        //@ts-ignore
        type = Reflect.getMetadata(REFLECT_TYPE, x);
    }
    if (!type) type = x[Symbol.for(REFLECT_TYPE)] || null;
    return type as ReflectTypeOf<T>
}


function humanReadableNameAndTypes(
    humanReadable: (_: ReflectType) => string,
    nt: {name: string, type: ReflectType}[]
): string {
    return nt.map(({ name, type }) => name + ':' + humanReadable(type)).join(', ')
}

function _humanReadable(humanReadable: (_: ReflectType) => string, t: ReflectType): string {
    switch (t.kind) {
        case Kind.Any:
        case Kind.Unknown:
        case Kind.Void:
        case Kind.Undefined:
        case Kind.Null:
        case Kind.Never:
        case Kind.String:
        case Kind.Number:
        case Kind.Boolean:
        case Kind.Enum:
        case Kind.BigInt:
        case Kind.ESSymbol:
            return t.kind


        case Kind.StringLiteral:
        case Kind.NumberLiteral:
        case Kind.BooleanLiteral:
        case Kind.EnumLiteral:
        case Kind.BigIntLiteral:
            return JSON.stringify(t.value)

        case Kind.Union:
            return t.types.map(humanReadable).join('|')

        case Kind.Intersection:
            return t.types.map(humanReadable).join('&')

        case Kind.Interface:
        case Kind.Class:
            return t.name + '{' + humanReadableNameAndTypes(humanReadable, t.members) + '}'
        case Kind.Object:
            return '{' + humanReadableNameAndTypes(humanReadable, t.members) + '}'

        case Kind.Function:
        // case Kind.Method:
            return t.name + '(' + humanReadableNameAndTypes(humanReadable, t.signatures[0].parameters) + ') => ' + humanReadable(t.signatures[0].returnType)
                + ((t.signatures.length > 1) ? (' +' + (t.signatures.length - 1) + 'signatures') : '')

        case Kind.Reference:
            let name = typeof t.type === 'function' ? t.type.name : t.type.runTypeInjectReferenceName
            return name + '<' + t.typeArguments.map(humanReadable).join(', ') + '>'

        case Kind.Tuple:
            return '[' + t.typeArguments.map(humanReadable).join(', ') + ']'

        case Kind.TypeParameter:
            return '<' + t.name + '>'
        default:
            // @ts-ignore
            return (t.name ? t.name : t.toString())
    }
}

export const humanReadable: (x: ReflectType) => string = Y(circularHandler({
    shouldMemo: (_: ReflectType) => true,
    keyMaker: (x: ReflectType) => x,
    // @ts-ignore
    circularMarker: (x: ReflectType) => '[Circular ' + (x.name ? x.name : 'reference') + ']',
    replaceMarker: (_marker: string, result: string) => result,
}, _humanReadable))

export function getLiteralOfType(kind: Kind.String | Kind.Number | Kind.Boolean | Kind.Enum | Kind.BigInt): Kind {
    switch (kind) {
        case Kind.String: return Kind.StringLiteral
        case Kind.Number: return Kind.NumberLiteral
        case Kind.Boolean: return Kind.BooleanLiteral
        case Kind.Enum: return Kind.EnumLiteral
        case Kind.BigInt: return Kind.BigIntLiteral
        default: return null as never
    }
}


// export function isCompatible(needed: ReflectType, candidate: ReflectType): boolean
// export function isCompatible(needed: ReflectType, candidate: ReflectType, circTypes: ReflectType[]): boolean
export function isCompatible(needed: ReflectType, candidate: ReflectType, circTypes?: ReflectType[]): boolean {
    if(!circTypes) circTypes = []

    if (~circTypes.indexOf(needed)) return true // TODO think this through
    else circTypes.push(needed)

    switch (needed.kind) {
        case Kind.Any:
            return true

        case Kind.Unknown:
        case Kind.Void:
        case Kind.Undefined:
        case Kind.Null:
        case Kind.Never:
        case Kind.ESSymbol:
            return candidate.kind === needed.kind

        case Kind.String:
        case Kind.Number:
        case Kind.Boolean:
        case Kind.Enum:
        case Kind.BigInt:
            return candidate.kind === needed.kind || candidate.kind === getLiteralOfType(needed.kind)

        case Kind.StringLiteral:
        case Kind.NumberLiteral:
        case Kind.BooleanLiteral:
        case Kind.EnumLiteral:
        case Kind.BigIntLiteral:
            return candidate.kind === needed.kind && candidate.value === needed.value

        case Kind.Union:
            const candidateTypes = candidate.kind === Kind.Union ? candidate.types : [candidate]
            return candidateTypes.every((candidateType) =>
                needed.types.some((neededType) =>
                    isCompatible(neededType, candidateType, circTypes)))

        case Kind.Intersection:
            return needed.types.every((neededType) => isCompatible(neededType, candidate, circTypes))

        case Kind.Object:
        case Kind.Interface:
        case Kind.Class:
            if (candidate.kind !== Kind.Object
                && candidate.kind !== Kind.Interface
                && candidate.kind !== Kind.Class) return false

            return needed.members.every(({ name: nname, type: ntype }) =>
                candidate.members.some(({ name: cname, type: ctype }) =>
                    nname === cname && isCompatible(ntype, ctype, circTypes)))

        case Kind.Function:
        // case Kind.Method:
            if (candidate.kind !== Kind.Function) return false

            // TODO: smarter multisignature ? (covariance ect...)
            return candidate.signatures.length === needed.signatures.length
                && needed.signatures.every((nsignature, i) => {
                    return isCompatible(nsignature.returnType, candidate.signatures[i].returnType, circTypes)
                        && nsignature.parameters.length === candidate.signatures[i].parameters.length
                        && nsignature.parameters.every(({ type }, j) => isCompatible(candidate.signatures[i].parameters[j].type, type, circTypes))
                })

        case Kind.Reference:
            return candidate.kind === Kind.Reference
                && candidate.type === needed.type
                && needed.typeArguments.length === candidate.typeArguments.length
                && needed.typeArguments.every((ntype, i) => isCompatible(ntype, candidate.typeArguments[i], circTypes))

        case Kind.Tuple:
            return candidate.kind === Kind.Tuple
                && needed.typeArguments.length === candidate.typeArguments.length
                && needed.typeArguments.every((ntype, i) => isCompatible(ntype, candidate.typeArguments[i], circTypes))

        case Kind.TypeParameter:
            return candidate.kind === Kind.TypeParameter // TODO more later

        default:
            return false
    }
}