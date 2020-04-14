import 'reflect-metadata'
import { ReflectType, isCompatible, humanReadable } from '@tsmirror/reflect'
import { Kind, getTypeOf } from '@tsmirror/reflect'
import Trace from './trace'

import {FunctionFactory, Constructor, Factory, Scope, IContainer} from './types'

const NotResolvedYet: unique symbol = Symbol('not resolved yet')

interface Provider<T> {
    name: string
    scope: Scope
    parameters: { name: string, type: ReflectType }[]
    returnType: ReflectType
    factory: FunctionFactory<T>
}

type ResolveProvider<T> = (provider: Provider<T>, trace: Trace) => T | typeof NotResolvedYet

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

export default class Container implements IContainer {
    parent: Container | null = null
    providers: Provider<any>[] = []
    instances: Map<Provider<any>, any> = new Map()

    child(): IContainer {
        let child = new Container()
        child.parent = this;
        return child
    }

    reset(): void {
        this.providers = []
        this.instances = new Map()
    }

    register<T>(scope: Scope, factory: Factory<T>, type?: ReflectType): void {
        const provider: Provider<T> = factoryToProvider<T>(scope, factory, type);
        if (provider.returnType.kind === Kind.Void) {
            throw new Error('cant register a void-returning factory')
        }
        this.providers.push(provider);
    }

    singleton<T>(factory: Factory<T>): void { return this.register(Scope.ContainerSingleton, factory) }

    resolve<T>(factory: Factory<T>): T {
        const provider = factoryToProvider<T>(Scope.Resolution, factory);
        const trace = new Trace()
        let resolved = this.resolveProvider<T>(provider, trace)
        console.log("resolve", trace.toString())
        if (resolved !== NotResolvedYet) return resolved
        else throw new Error(trace.toString())
    }

    private resolveSingleParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T | typeof NotResolvedYet {
        const candidates = this.providers.filter(({ returnType }) => {
            let result = isCompatible(type, returnType)
            trace.log('candidate', humanReadable(returnType), 'vs', humanReadable(returnType), result)
            return result
        })
        let picked: T | typeof NotResolvedYet = NotResolvedYet
        trace.log('got', candidates.length, 'candidates for type');
        for (var j = 0; j < candidates.length; j++) {
            const candidate = candidates[j]
            let resolved = resolveProvider(candidate, trace.child('  '))
            if (resolved === NotResolvedYet) {
                trace.log('next candidate');
                continue;
            } else if (picked === NotResolvedYet) {
                trace.log('got one candidate, checking for more');
                picked = resolved
            } else {
                trace.log('second resolvable candidates: giving up')
                return NotResolvedYet
            }
        }
        if (this.parent && picked === NotResolvedYet) {
            let parentResolved = this.parent.resolveSingleParameter<T>(resolveProvider, type, trace.child('  parentContainer '))
            if (parentResolved !== NotResolvedYet) picked = parentResolved
        }
        return picked
    }

    private resolveArrayParameter<T>(resolveProvider: ResolveProvider<T>, type: ReflectType, trace: Trace): T[] {
        const candidates = this.providers.filter(({ returnType }) => isCompatible(type, returnType))
        let picked: T[] = []
        trace.log('got', candidates.length, 'candidates for type');
        for (var j = 0; j < candidates.length; j++) {
            const candidate = candidates[j]
            let resolved = resolveProvider(candidate, trace.child('  '))
            if (resolved === NotResolvedYet) {
                trace.log('next candidate');
                continue;
            } else {
                trace.log('got one candidate');
                picked.push(resolved)
            }
        }
        if (this.parent) {
            picked.concat(this.parent.resolveArrayParameter<T>(resolveProvider, type, trace.child('  parentContainer ')))
        }
        return picked
    }

    private resolveProvider<T>(provider: Provider<T>, trace: Trace): T | typeof NotResolvedYet {
        let existing = this.instances.get(provider)
        if(existing) return existing

        const resolvedParameters = []
        trace.log('resolving ', provider.name, '(', provider.parameters.map(({ name, type }) =>
            // @ts-ignore
            name + (type.name ? ':' + type.name : '')), ')')

        for (var i = 0; i < provider.parameters.length; i++) {
            let parameter = provider.parameters[i]
            let type = parameter.type
            let traceChild = trace.child(`  parameter${i} (${parameter.name}) `)
            let resolver: ResolveProvider<T> = this.resolveProvider.bind(this)

            if (type.kind === Kind.Reference && type.type === Array) {
                let resolved = this.resolveArrayParameter(resolver, type.typeArguments[0], traceChild)
                if(resolved.length === 0) return NotResolvedYet
                else resolvedParameters[i] = resolved
            } else {
                let resolved = this.resolveSingleParameter(resolver, type, traceChild)
                if(resolved === NotResolvedYet) return NotResolvedYet
                else resolvedParameters[i] = resolved
            }
        }

        trace.log('resolved ', provider.name)
        let result = provider.factory(...resolvedParameters)
        if(provider.scope === Scope.ContainerSingleton) this.instances.set(provider, result)
        return result
    }
}

