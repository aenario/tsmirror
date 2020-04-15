import { ReflectType, Reflecting } from "@tsmirror/reflect"
import Trace from "./trace"

export type FunctionFactory<T> = (...args: any[]) => T
export type Constructor<T> = { new (...args: any[]): T }
export type Factory<T> = Constructor<T> | FunctionFactory<T>

export enum Scope {
    ContainerSingleton,
    Singleton,
    Resolution
}

export const NotResolvedYet: unique symbol = Symbol('not resolved yet')

interface Provider<T> {
    name: string
    scope: Scope
    parameters: { name: string, type: ReflectType }[]
    returnType: ReflectType
    factory: FunctionFactory<T>
}

export type ResolveProvider<T> = (provider: Provider<T>, trace: Trace) => T | typeof NotResolvedYet


export interface IContainer {
    register: (scope: Scope, factory: Factory<any>, type: ReflectType) => void
    injectable: Reflecting<(factory: Factory<any>) => void>
    containerSingleton: Reflecting<(factory: Factory<any>) => void>
    singleton: Reflecting<(factory: Factory<any>) => void>
    resolve: Reflecting<<T>(factory: Factory<T>) => T>
    child: () => IContainer
    reset: () => void
    /* @internal */
    resolveSingleParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T | typeof NotResolvedYet 
    /* @internal */
    resolveArrayParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T[]
}

