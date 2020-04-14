import type { Factory } from './types'
import { Scope } from './types'
import ContainerClass from './container'
import { ReflectType, reflecting, Reflecting } from '@tsmirror/reflect';

export const rootContainer = new ContainerClass();

export function injectable<T>(scope: Scope): Reflecting<(factory: Factory<T>) => void> {
    return reflecting((type: ReflectType) => {
        return function _injectable(factory: Factory<T>): void {
            rootContainer.register(scope, factory, type)
        }
    })
}

export function resolve<T>(f: Factory<T>): T {
    return rootContainer.resolve(f)
}