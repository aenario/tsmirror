export type FunctionFactory<T> = (...args: any[]) => T
export type Constructor<T> = { new (...args: any[]): T }
export type Factory<T> = Constructor<T> | FunctionFactory<T>

export enum Scope {
    ContainerSingleton,
    Singleton,
    Resolution
}

export interface IContainer {
    register: (scope: Scope, factory: FunctionFactory<any>) => void,
    singleton: (factory: FunctionFactory<any>) => void,
    resolve: <T>(factory: FunctionFactory<T>) => T,
    reset: () => void
}