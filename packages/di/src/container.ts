import 'reflect-metadata'
import { ReflectType, isCompatible } from '@tsmirror/reflect'
import { Kind, getTypeOf } from '@tsmirror/reflect'


export interface Container {
    register: (factory: Function) => void,
    get: <T>(factory: (...args: any[]) => T) => T
}

interface Bean {
    name: string,
    parameters: { name: string, type: ReflectType }[]
    returnType: ReflectType
    resolved?: any
    factory: Function
}

class Trace {
    depth: number = 0
    msgs: string[] = []

    log(...args: any) {
        let msg = ''
        for (var i = 0; i < this.depth; i++) msg += '  '
        this.msgs.push(msg + args.join(' '))
    }
    child(): Trace {
        const t = new Trace()
        t.depth = this.depth + 1
        t.msgs = this.msgs
        return t
    }
    toString(): string {
        return this.msgs.join('\n')
    }
}


export function makeContainer() {

    const beans = [] as Bean[]

    const factoryToBean = (factory: Function): Bean => {
        const t: ReflectType = getTypeOf(factory)
        if (t === null) throw new Error('Factory function has not been reflected')
        if (t.kind !== Kind.Function) throw new Error('Only functions are accepted as factory, got ' + t)
        let sig = t.signatures[0]
        let parameters = sig.parameters
        let returnType = sig.returnType
        let name = t.name || 'Anonymous'

        return { name, factory, parameters, returnType }
    }

    const register = (factory: Function) => {
        const bean = factoryToBean(factory);
        if (bean.returnType.kind === Kind.Void) {
            throw new Error('cant register a void-returning factory')
        }
        beans.push(factoryToBean(factory));
    }

    const get = (factory: Function) => {
        const tmpbean = factoryToBean(factory)
        const trace = new Trace()
        resolve(tmpbean, trace)
        if (tmpbean.resolved) return tmpbean.resolved
        else throw new Error(trace.toString())
    }
    const resolve = (bean: Bean, trace?: Trace) => {
        const resolvedParameters = []
        if (bean.resolved) {
            trace.log('bean ', bean.name, ' already resolved')
            return
        }
        trace.log('resolving ', bean.name, '(', bean.parameters.map(({name}) => name), ')')
        for (var i = 0; i < bean.parameters.length; i++) {
            const parameter = bean.parameters[i]
            const candidates = beans.filter(({ returnType }) => isCompatible(parameter.type, returnType))
            trace.log(candidates.length, ' candidates for parameter ', i, ' (', parameter.name, ')')
            let picked = null
            for (var j = 0; j < candidates.length; j++) {
                const candidate = candidates[j]
                resolve(candidate, trace.child())
                if (!candidate.resolved) {
                    trace.log('next candidate');
                    continue;
                }
                if (picked) {
                    trace.log('second resolvable candidates for parameter ', i, ' (', parameter.name, ') giving up')
                    return
                }
                picked = candidate.resolved
                trace.log('got one candidate, checking for more');
            }
            if (picked === null) {
                trace.log('no resolvable candidate for parameter ', i, ' (', parameter.name, ') giving up')
                return
            }
            resolvedParameters[i] = picked
        }

        trace.log('resolved ', bean.name)
        bean.resolved = bean.factory(...resolvedParameters)
    }

    return { register, get }
}