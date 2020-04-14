import { ReflectType, reflecting } from '@tsmirror/reflect'
import { Kind, getTypeOf } from '@tsmirror/reflect'
import blns from './blns'
import { inspect } from 'util'

const NAUGHTYNUMBERS: number[] = [0, -1, 1, Infinity, -Infinity, NaN, 42e42, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]

const flatMap = <T, U>(arr: T[], mapper: (t: T) => U): U[] => {
    return ([] as U[]).concat(...arr.map(mapper))
}

/*
type twoMapper<T, U, V> = (t: T, u: U) => V
const cart2 = <T, U, V>(a1: T[], a2: U[], mapper: twoMapper<T, U, V>) : V[][] => {
    return flatMap(a1, (t) => {
        const res = a2.map((u) =>
            mapper(t, u)
        )
        return res
    })
}
*/

export function possibleValues(type: ReflectType): any[] {
    switch (type.kind) {
        case Kind.Undefined: return [undefined]
        case Kind.Null: return [null]
        case Kind.Enum: return type.values
        case Kind.String: return blns
        case Kind.Number: return NAUGHTYNUMBERS
        case Kind.Boolean: return [true, false]
        case Kind.BigInt: return NAUGHTYNUMBERS.map((n) => BigInt(n))
        case Kind.ESSymbol: return [Symbol.for('test-symbol')]

        case Kind.StringLiteral:
        case Kind.NumberLiteral:
        case Kind.BooleanLiteral:
        case Kind.EnumLiteral:
        case Kind.BigIntLiteral:
            return [type.value]

        case Kind.Union:
            return flatMap(type.types, (t) => possibleValues(t))

        case Kind.Object:
        case Kind.Interface:
        case Kind.Class:
            return type.members.reduce((acc, { name, type }) => {
                const tvalues = possibleValues(type)
                return flatMap(acc, (accitem: any) =>
                    tvalues.map((tvaluesitem: any) =>
                        Object.assign({ [name]: tvaluesitem }, accitem)
                    )
                )
            }, [{}])

        case Kind.Reference:
            // @ts-ignore
            if (type.type === Array) {
                // TODO more
                const tvalues = possibleValues(type.typeArguments[0])
                return flatMap(tvalues, (v) => [[], [v]])
            }
            throw new Error('not supported yet' + type);

        case Kind.Tuple:
            return type.typeArguments.reduce((acc, type) => {
                const tvalues = possibleValues(type)
                return flatMap(acc, (accitem: any) =>
                    tvalues.map((tvaluesitem: any) =>
                        accitem.concat(tvaluesitem)
                    )
                )
            }, [[]] as any[][])

        case Kind.Any:
        case Kind.Unknown:
        case Kind.Void:
        case Kind.Never:
        case Kind.Intersection:
        case Kind.Function:
        //case Kind.Method:
        case Kind.TypeParameter:
        default:
            throw new Error(type.kind + ' type parameter not supported yet')
    }
}

export const fuzzer = reflecting((rt: ReflectType) => (runner: Function) => {
    return _fuzzer(runner, rt)
})

function _fuzzer(runner: Function, type: ReflectType): void {
    const t = type || getTypeOf(runner)
    if (t === null) throw new Error('runner function has not been reflected')
    if (t.kind !== Kind.Function) throw new Error('Only functions are accepted as runner, got ' + t)
    let sig = t.signatures[0]
    let parameters = sig.parameters

    let values = possibleValues({ reflecttypeid: -666, kind: Kind.Tuple, typeArguments: parameters.map(({ type }) => type) })
    values.forEach((args) => {
        try {
            runner.apply(null, args)
        } catch (err) {
            throw new Error(err.message + ' with args ' + inspect(args, false, 5, false))
        }
    })
}