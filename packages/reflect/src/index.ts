import { ReflectType, Reflecting, REFLECTING_SYMBOL, REFLECT_TYPE_SYMBOL,  ReflectTypeOf } from './type'

export * from './type';
export * from './utils';

export function reflect<T>(_x?: T): ReflectTypeOf<T> {
    // macro to be replaced at compile time
    throw new Error('tsmirror.reflect was not compiled out.')
}

export function reflected<T, X = { new (...args: any[]): T }>(_x: X): X & {[REFLECT_TYPE_SYMBOL]: ReflectTypeOf<T>} // class constructor
export function reflected<T, X = T>(_x: T): T & {[REFLECT_TYPE_SYMBOL]: ReflectTypeOf<T>}
export function reflected<T>(_x: T): T & {[REFLECT_TYPE_SYMBOL]: ReflectTypeOf<T>} {
    // macro to be replaced at compile time
    throw new Error('tsmirror.reflected was not compiled out.')
}


export function reflecting<FN extends (...args: any[]) => any>(fn: (t: ReflectType) => FN): Reflecting<FN> {
    // macro to be replaced at compile time
    let f = fn as Reflecting<FN>
    f[REFLECTING_SYMBOL]=true
    return f
}