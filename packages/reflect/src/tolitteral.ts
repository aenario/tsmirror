import * as ts from "typescript"
import { Y, circularHandler } from "./circular"
import { Kind } from "./type"


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

    if (t == 'object' && x.runTypeInjectReferenceName) {
        return ts.createIdentifier(x.runTypeInjectReferenceName)
    }

    if (t == 'object')
        return ts.createObjectLiteral(
            Object.keys(x)
                .filter((k) => k !== 'reflecttypeid' && typeof x[k] != 'undefined')
                .map((k) => ts.createPropertyAssignment(k, toLiteral(x[k])))
        )

    throw new Error('dont know how to literalize ' + x)
}

const NOMEMOTYPES = [
    Kind.Any,
    Kind.Unknown,
    Kind.String,
    Kind.Number,
    Kind.BooleanLiteral,
    Kind.Boolean,
    Kind.Enum,
    Kind.BigInt,
    Kind.ESSymbol,
    Kind.Void,
    Kind.Undefined,
    Kind.Null,
    Kind.Never,
]

export function toLitteral(x: any): ts.Expression {

    let nameCounter = 0
    const identifiers: Map<string, ts.Expression> = new Map()
    let hasCircular = false

    let res = Y(circularHandler({
        shouldMemo: (x: any) => (typeof x === 'object') && x && x.reflecttypeid && x.hasOwnProperty('kind') && -1 === NOMEMOTYPES.indexOf(x.kind) ,
        keyMaker: (x) => x.reflecttypeid,
        circularMarker: () => ts.createIdentifier('var' + (nameCounter++)),
        useMarker: (variableName: ts.Identifier) => { hasCircular=true; return variableName},
        replaceMarker: (variableName: ts.Identifier, res: ts.Expression) => {
            identifiers.set(variableName.text, res);
            return variableName
        }
    }, _toLiteral))(x)

    if (identifiers.size == 0) return res
    if (!hasCircular && identifiers.size == 1) return Array.from(identifiers.values())[0]

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
