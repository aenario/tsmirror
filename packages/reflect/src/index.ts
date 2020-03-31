import { ReflectType } from './type'

export * from './type';
export * from './utils';

// @ts-ignore
export function reflect<T>(_t?: T): ReflectType {
    // macro to be replaced at compile time
    throw new Error('tsmirror.reflect was not compiled out.')
}

export function reflected<T>(_t: T): T {
    // macro to be replaced at compile time
    throw new Error('tsmirror.reflected was not compiled out.')
}
