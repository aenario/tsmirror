import * as ts from "typescript"
import { Y, circularHandler } from "./circular"


// toLitteral take any object and transforms it into a typescript Expression
// which would give the same object in javascript
// BEWARE: classes will become POJO
type ToLiteral = (x: any) => ts.Expression
function _toLiteral(toLiteral: ToLiteral, x: any): ts.Expression {
    if (x === null)
        return ts.createNull()

    let t = typeof x
    if (t == 'undefined')
        return ts.createIdentifier('undefined')

    if (t == 'boolean' || t == 'number' || t == 'string')
        return ts.createLiteral(x);

    if (t == 'symbol')
        return ts.createCall(
            ts.createPropertyAccess(ts.createIdentifier('Symbol'), ts.createIdentifier('for')),
            [], // type arguments
            [ts.createLiteral(x.toString().slice(7, -1))])

    if (t == 'object' && Array.isArray(x))
        return ts.createArrayLiteral(x.map(toLiteral))

    if (t == 'object' && x.runTypeInjectReferenceName)
        return ts.createIdentifier(x.runTypeInjectReferenceName)

    if (t == 'object')
        return ts.createObjectLiteral(
            Object.keys(x)
                .filter((k) => typeof x[k] != 'undefined')
                .map((k) => ts.createPropertyAssignment(k, toLiteral(x[k])))
        )

    throw new Error('dont know how to literalize ' + x)
}

export function toLitteral(x: any): ts.Expression {

    let nameCounter = 0
    const identifiers: Map<string, ts.Expression> = new Map()

    let res = Y(circularHandler({
        shouldMemo: (x: any) => (typeof x === 'object') && x.hasOwnProperty('kind'),
        keyMaker: (x) => x,
        circularMarker: () => ts.createIdentifier('var' + (nameCounter++)),
        replaceMarker: (x: ts.Identifier, res: ts.Expression) => { identifiers.set(x.text, res) }
    }, _toLiteral))(x)

    if (identifiers.size == 0) return res

    let resName = ''
    const varTypes = Array.from(identifiers.entries()).reverse()

    // TODO: figure out a way to sort varTypes so we dont need to Object.assign


    const mod = ts.createModifiersFromModifierFlags(ts.ModifierFlags.None)
    const varDeclarations =
        varTypes.map(([name]): ts.Statement => {
            const type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            const decl = ts.createVariableDeclaration(name, type, ts.createObjectLiteral())
            return ts.createVariableStatement(mod, [decl])
        })

    const assignments =
        varTypes.map(([name, obj]): ts.Statement => {
            if (res === obj) resName = name;
            return ts.createExpressionStatement(ts.createCall(
                ts.createPropertyAccess(ts.createIdentifier('Object'), ts.createIdentifier('assign')),
                [],
                [ts.createIdentifier(name), obj]
            ))
        })

    return ts.createImmediatelyInvokedArrowFunction(
        varDeclarations.concat(...assignments).concat(ts.createReturn(resName ? ts.createIdentifier(resName) : res)))



}
