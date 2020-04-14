import 'reflect-metadata'
import { ReflectType, reflecting } from '../lib';

interface A {
    prop: string
}

const a: A = { prop: 'hello' }

const isAnInterface = reflecting((t: ReflectType) => (_arg: any) => {
    return t.kind === "interface"
} )

export const result = isAnInterface(a)