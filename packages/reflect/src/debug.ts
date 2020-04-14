import type { Context } from './transformer'

let debug = (_ctx: Context | null, ..._args: any[]) => { };

if (process.env.REFLECT_DEBUG) {
    debug = (ctx: Context | null, ...args: any[]) => console.log(Array(ctx && ctx.depth || 0).fill('').join(' '), ...args)

}



export default debug