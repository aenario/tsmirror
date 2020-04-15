import 'reflect-metadata'
import { ReflectType, isCompatible, humanReadable, reflecting } from '@tsmirror/reflect'
import { Kind, getTypeOf } from '@tsmirror/reflect'
import Trace from './trace'

import {FunctionFactory, Constructor, Factory, Scope, IContainer, NotResolvedYet, ResolveProvider} from './types'

interface Provider<T> {
    name: string
    scope: Scope
    parameters: { name: string, type: ReflectType }[]
    returnType: ReflectType
    factory: FunctionFactory<T>
}

const debug = process.env.DEBUG_DI ? (...args: any[]) => console.log(...args) : (..._args: any[]) => {}

const factoryToProvider = <T>(scope: Scope, factoryArg: FunctionFactory<T> | Constructor<T>, providedType?: ReflectType): Provider<T> => {
    const type = providedType ? providedType : getTypeOf(factoryArg)
    if (type === null) throw new Error('Factory function has not been reflected')
    if (type.kind === Kind.Function) {
        // TODO: optional arguments & alternatives signatures
        let sig = type.signatures[0]
        let parameters = sig.parameters
        let returnType = sig.returnType
        let name = type.name || 'Anonymous'
        let factory = <FunctionFactory<T>>factoryArg

        return { name, factory, scope, parameters, returnType/*, resolved: NotResolvedYet*/ }
    } if (type.kind === Kind.Class) {
        // TODO: optional arguments & alternatives signatures
        let sig = type.constructorSignatures[0]
        let parameters = sig.parameters
        let returnType = type
        let name = type.name || 'AnonymousClass'
        let factory: FunctionFactory<T> = (...args) => new (<Constructor<T>>factoryArg)(...args)

        return { name, factory, scope, parameters, returnType/*, resolved: NotResolvedYet*/ }
    } else {
        throw new Error('Only functions are accepted as factory, got ' + type)
    }
}

export function makeContainer(parent?: IContainer, name: string = 'root'): IContainer {
    const providers: Provider<any>[] = []
    const instances: Map<Provider<any>, any> = new Map()
    let childCount = 0

    function reset(): void {
        childCount = 0
        providers.length = 0
        instances.clear()
    }

    function register<T>(scope: Scope, factory: Factory<T>, type: ReflectType): void {
        const provider: Provider<T> = factoryToProvider<T>(scope, factory, type);
        if (provider.returnType.kind === Kind.Void) {
            throw new Error('cant register a void-returning factory')
        }
        providers.push(provider);
    }

    const injectable = reflecting((type: ReflectType) => {
        return function _singleton(factory: Factory<any>): void {
            register(Scope.Resolution, factory, type)
        }
    })

    const containerSingleton = reflecting((type: ReflectType) => {
        return function _singleton(factory: Factory<any>): void {
            register(Scope.ContainerSingleton, factory, type)
        }
    })


    const singleton = reflecting((type: ReflectType) => {
        return function _singleton(factory: Factory<any>): void {
            register(Scope.Singleton, factory, type)
        }
    })

    const resolve = reflecting((type: ReflectType) => function _resolve<T>(factory: Factory<T>): T {
        const provider = factoryToProvider<T>(Scope.Resolution, factory, type);
        const trace = new Trace()
        let resolved = resolveProvider<T>(provider, trace)
        debug(name, "resolve", trace.toString())
        if (resolved !== NotResolvedYet) return resolved
        else throw new Error('Cant resolve \n' + trace.toString())
    })

    function resolveSingleParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T | typeof NotResolvedYet {
        const candidates = providers.filter(({ returnType }) => {
            let result = isCompatible(type, returnType)
            trace.log(name, 'candidate', humanReadable(returnType), 'vs', humanReadable(returnType), result)
            return result
        })
        let picked: T | typeof NotResolvedYet = NotResolvedYet
        trace.log(name, 'got', candidates.length, 'candidates for type');
        for (var j = 0; j < candidates.length; j++) {
            const candidate = candidates[j]
            let existing = instances.get(candidate)
            let resolved =  existing ? existing : resolveProvider(candidate, trace.child('  '))
            if (resolved === NotResolvedYet) {
                trace.log(name, 'next candidate');
                continue;
            } else if (picked === NotResolvedYet) {
                trace.log(name, 'got one candidate, checking for more');
                if(candidate.scope === Scope.Singleton){
                    trace.log(name, 'scope Singleton, storing in my instances')
                    instances.set(candidate, resolved)
                }
                picked = resolved
            } else {
                trace.log(name, 'second resolvable candidates: giving up')
                return NotResolvedYet
            }
        }
        if (parent && picked === NotResolvedYet) {
            let parentResolved = parent.resolveSingleParameter<T>(resolveProvider, type, trace.child('  '))
            if (parentResolved !== NotResolvedYet) picked = parentResolved
        }
        return picked
    }

    function resolveArrayParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T[] {
        const candidates = providers.filter(({ returnType }) => isCompatible(type, returnType))
        let picked: T[] = []
        trace.log(name, 'got', candidates.length, 'candidates for type');
        for (var j = 0; j < candidates.length; j++) {
            const candidate = candidates[j]
            let existing = instances.get(candidate)
            let resolved =  existing ? existing : resolveProvider(candidate, trace.child('  '))
            if (resolved === NotResolvedYet) {
                trace.log(name, 'next candidate');
                continue;
            } else {
                trace.log(name, 'got one candidate');
                picked.push(resolved)
            }
        }
        if (parent) {
            picked = picked.concat(parent.resolveArrayParameter<T>(resolveProvider, type, trace.child('  parentContainer ')))
        }
        return picked
    }

    // TODO circular should throw
    function resolveProvider<T>(provider: Provider<T>, trace: Trace): T | typeof NotResolvedYet {
        let existing = instances.get(provider)
        if(existing) return existing

        const resolvedParameters = []
        trace.log(name, 'resolving ', provider.name, '(', provider.parameters.map(({ name, type }) =>
            // @ts-ignore
            name + (type.name ? ':' + type.name : '')), ')')

        for (var i = 0; i < provider.parameters.length; i++) {
            let parameter = provider.parameters[i]
            let type = parameter.type
            let traceChild = trace.child(`  parameter${i} (${parameter.name}) `)

            if (type.kind === Kind.Reference && type.type === Array) {
                let resolved = resolveArrayParameter(resolveProvider, type.typeArguments[0], traceChild)
                if(resolved.length === 0) return NotResolvedYet
                else resolvedParameters[i] = resolved
            } else {
                let resolved = resolveSingleParameter(resolveProvider, type, traceChild)
                if(resolved === NotResolvedYet) return NotResolvedYet
                else resolvedParameters[i] = resolved
            }
        }

        trace.log(name, 'resolved ', provider.name)
        let result = provider.factory(...resolvedParameters)
        if(provider.scope === Scope.ContainerSingleton) {
            trace.log(name, 'scope ContainerSingleton, storing in my instances')
            instances.set(provider, result)
        }
        return result
    }

    const self: IContainer = {child, reset, register, resolve, singleton, injectable, containerSingleton, resolveSingleParameter, resolveArrayParameter}

    function child(): IContainer {
        return makeContainer(self, name+'.child' + (++childCount))
    }

    return self
}

