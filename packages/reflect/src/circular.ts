
// Helper for handling circular object reference


// Can't believe I am actually using a Ycombinator
// let's make it js style (with multiple arguments)
type ArgsBase = any[]
type FN<Args extends ArgsBase, Res> = (...args: Args) => Res
type MFN<Args extends ArgsBase, Res> = (fn: FN<Args, Res>, ...args: Args) => Res

type WHY = <Args extends ArgsBase, Res>(mfn: MFN<Args, Res>) => FN<Args, Res>
type MAKER<Args extends ArgsBase, Res> = (m: MAKER<Args, Res>) => (...args: Args) => Res

const M = <Args extends ArgsBase, Res>(x: MAKER<Args, Res>): FN<Args, Res> => x(x)

export const Y : WHY = <Args extends ArgsBase, Res> (mfn: MFN<Args, Res>) =>
    M((maker: MAKER<Args, Res>) => (...args: Args) => mfn(maker(maker), ...args))

type KeyMaker<Args extends ArgsBase, Key> = (...args: Args) => Key
type ShouldMemo<Args extends ArgsBase> = (...args: Args) => boolean

export function circularHandler<Args extends ArgsBase, Key, Marker extends Res, Res>(
    params: {
        shouldMemo: ShouldMemo<Args>,
        keyMaker: KeyMaker<Args, Key>,
        circularMarker: FN<Args, Marker>,
        replaceMarker: (tmp: Marker, final: Res) => void
    },
    mfn: MFN<Args, Res>,
) : MFN<Args, Res>  {
    const lookup: Map<Key, Res> = new Map()

    return (fn: FN<Args, Res>, ...args: Args) => {
        const shouldMemo = params.shouldMemo(...args);
        let key, existing
        if(shouldMemo) {
            key = params.keyMaker(...args);
            existing = lookup.get(key);
            if(existing) return lookup.get(key);

            existing = params.circularMarker(...args)
            lookup.set(key, existing)
        }
        let res = mfn(fn, ...args)
        if(shouldMemo) {
            params.replaceMarker(existing, res)
            lookup.set(key, res)
        }
        return res
    }
}