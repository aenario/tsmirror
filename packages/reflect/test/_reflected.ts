import 'reflect-metadata'
import { reflected } from '../src/index'

interface A {
    prop: string
}

const a: A = { prop: 'hello' }

export const result = reflected(a)