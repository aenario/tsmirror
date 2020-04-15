import type { IContainer } from './types'
import { makeContainer } from './container'

export const rootContainer: IContainer = makeContainer();

export const injectable = rootContainer.injectable
export const singleton = rootContainer.singleton
export const containerSingleton = rootContainer.containerSingleton
export const createContainer = rootContainer.child
export const resolve = rootContainer.resolve
/*
export function injectable<T>(scope: Scope): Reflecting<(factory: Factory<T>) => void> {
    return reflecting((type: ReflectType) => {
        return function _injectable(factory: Factory<T>): void {
            rootContainer.register(scope, factory, type)
        }
    })
}

export const singleton = reflecting(<T>(type: ReflectType) => {
    return function _singleton(factory: Factory<T>): void {
        rootContainer.register(Scope.Singleton, factory, type)
    }
})

export const resolve = reflecting(<T>(type: ReflectType) => {
    return function _resolve(f: Factory<T>): T {
        return rootContainer.resolve(f, type)
    }
})

export function createContainer(): IContainer {
    return rootContainer.child()
}*/