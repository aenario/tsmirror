import 'reflect-metadata'
import { ReflectType, Kind, reflecting, ReflectTypeOf, WithKind, Reflecting } from '@tsmirror/reflect'
import { humanReadable } from '@tsmirror/reflect'


export type Maybe<T> = { ok: true, value: T } | { ok: false, reason: string }

const parserFactory = <T>(rt: ReflectType) => (json: string): Maybe<T> => {
    try {
        let res = JSON.parse(json)
        return cast(rt, res)
    } catch (err) {
        return {ok: false, reason: err.message as string}
    }
}

export const parse = reflecting(parserFactory) as Reflecting<<T>(json: string) => Maybe<T>>

// TODO: circularHandler
function cast<T>(rt: ReflectType, v: T): Maybe<T> {
    switch (rt.kind) {
        case Kind.String:
        case Kind.Number:
        case Kind.Boolean:
            if (rt.kind === typeof v) return {ok: true, value: v}
            return {ok: false, reason: v + ' is not ' + rt.kind}

        case Kind.NumberLiteral:
        case Kind.StringLiteral:
        case Kind.BooleanLiteral:
        case Kind.EnumLiteral:
            if (rt.value === v) return {ok: true, value: v}
            return {ok: false, reason: v + ' is not ' + rt.value}

        case Kind.Enum:
            if ((typeof v === "string") && (rt.values as string[]).includes(v)) return {ok: true, value: v}
            if ((typeof v === "number") && (rt.values as number[]).includes(v)) return {ok: true, value: v}
            return {ok: false, reason: v + ' is not in ' + rt.name + '(' + rt.values + ')'}

        case Kind.Reference:
            if (rt.type !== Array) throw new Error('not implemented yet parse for ' + humanReadable(rt))

            if (!Array.isArray(v)) return {ok: false, reason: v + ' is not an array'}

            return v.reduce((reduced, x, idx) => {
                if(!reduced.ok) return reduced

                let res = cast(rt.typeArguments[0], x)
                if(!res.ok) return {ok: false, reason: res.reason + ' at index ' + idx}

                reduced.value.push(res.value)
                return reduced
            }, {ok: true, value: []})

        case Kind.Union:
            let reasons = []
            for (let i = 0; i < rt.types.length; i++) {
                let res = cast(rt.types[i] as ReflectTypeOf<typeof v>, v)
                if(res.ok) return res
                reasons.push(res.reason)
            }
            return {ok: false, reason: v + ' does not match any type in ' + humanReadable(rt) + '\n  -' + reasons.join('\n  -')}

        case Kind.Intersection:
            for (let i = 0; i < rt.types.length; i++) {
                let res = cast(rt.types[i] as ReflectTypeOf<typeof v>, v)
                if(!res.ok) return {ok: false, reason: v + ' does not match type ' + humanReadable(rt.types[i])}
            }
            return {ok: true, value: v}

        case Kind.Tuple:
            let tuplert = (rt as WithKind<ReflectType, Kind.Tuple>)
            if (!Array.isArray(v)) return {ok: false, reason: v + ' is not an array'}

            for (let i = 0; i < tuplert.typeArguments.length; i++) {
                let res = cast(tuplert.typeArguments[i] as ReflectTypeOf<typeof v>, v[i])
                if(!res.ok) return {ok: false, reason: res.reason + ' at index ' + i}
            }

            return {ok: true, value: v}

        case Kind.Undefined:
            // @ts-ignore
            if (v === null) return {ok: true, value: undefined}
            // @ts-ignore
            if (v === undefined) return {ok: true, value: undefined}
            return {ok: false, reason: v + ' is not null (undefined)'}

        case Kind.Null:
            // @ts-ignore
            if (v === null) return {ok: true, value: null}
            // @ts-ignore
            if (v === undefined) return {ok: true, value: null}
            return {ok: false, reason: v + ' is not null'}

        case Kind.Any:
            return {ok: true, value: v}

        case Kind.Object:
        case Kind.Interface:
            rt.members
            for (let i = 0; i < rt.members.length; i++) {
                let propname = rt.members[i].name
                // @ts-ignore
                let propvalue: any = v[propname]
                let res = cast(rt.members[i].type, propvalue)
                if(!res.ok) return {ok: false, reason: res.reason + ' at property ' + propname}
            }
            // TODO: check for extra properties ?
            return {ok: true, value: v}

        case Kind.Class: // TODO: cast ?
        case Kind.BigInt:
        case Kind.BigIntLiteral:
        case Kind.Unknown:
        case Kind.Void:
        case Kind.Never:
        case Kind.Function:
        case Kind.TypeParameter:
        case Kind.ESSymbol:
        default:
            return {ok: false, reason: 'not implemented yet parse for ' + humanReadable(rt)}
    }

}