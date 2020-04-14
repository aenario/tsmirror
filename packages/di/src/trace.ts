export default class Trace {
    prefix: string = ''
    depth: number = 0
    msgs: string[] = []

    log(...args: any) {
        // let msg = ''
        // for (var i = 0; i < this.depth; i++) msg += '  '
        this.msgs.push(this.prefix + args.join(' '))
    }
    child(prefix: string): Trace {
        const t = new Trace()
        t.prefix = this.prefix + prefix
        t.depth = this.depth + 1
        t.msgs = this.msgs
        return t
    }
    toString(): string {
        return this.msgs.join('\n')
    }
}
