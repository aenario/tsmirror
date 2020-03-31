import * as ts from 'typescript'
import * as path from 'path'
import { InternalReflectType as ReflectType, Kind, InternalNameAndType as NameAndType, REFLECT_TYPE } from './type'
import * as util from 'util';
import { realpathSync } from 'fs-extra';
import { Y, circularHandler } from './circular';
import { toLitteral } from './tolitteral';

interface Context {
  checker: ts.TypeChecker,
  // transformedMap: Map<number, ReflectType>
  typeArgumentsMapping?: Map<number, ReflectType>
}

type ToRunType = (t: ts.Type, ctx: Context) => ReflectType

function symbolArrayToNameTypes(toRunType: ToRunType, ctx: Context, symbols: ts.Symbol[]): NameAndType[] {
  const results: NameAndType[] = [];
  symbols.forEach((symbol) => {
    const t = ctx.checker.getTypeAtLocation(symbol.valueDeclaration)
    const res: NameAndType = { name: symbol.getName(), type: toRunType(t, ctx) }
    if(ts.isParameter(symbol.valueDeclaration)) {
      if(symbol.valueDeclaration.dotDotDotToken ) res.rest = true
      if(symbol.valueDeclaration.initializer) res.default = toRunType(ctx.checker.getTypeAtLocation(symbol.valueDeclaration.initializer), ctx)
    }
    results.push(res)
  })
  return results
}

function extractHeritageClauses(toRunType: ToRunType, ctx: Context, clauses: ts.NodeArray<ts.HeritageClause>): [ReflectType[], ReflectType[]] {
  if (!clauses) return [[], []]
  let implementedInterfaces = [] as ReflectType[]
  let extendedClass = [] as ReflectType[]
  clauses.forEach((clause) => {
    if (clause.token == ts.SyntaxKind.ImplementsKeyword)
      clause.types.forEach((clauseType) => {
        const t = ctx.checker.getTypeAtLocation(clauseType)
        implementedInterfaces.push(toRunType(t, ctx))
      })
    if (clause.token == ts.SyntaxKind.ExtendsKeyword)
      clause.types.forEach((clauseType) => {
        const t = ctx.checker.getTypeAtLocation(clauseType)
        extendedClass.push(toRunType(t, ctx))
      })
  })
  return [implementedInterfaces, extendedClass]
}

const KNOWN_REFERENCE = ['Array', 'Map', 'Set', 'WeakSet', 'WeakMap']


function referenceObjectTypeToRunType(toRunType: ToRunType, ctx: Context, type: ts.TypeReference): ReflectType {

  let typeArguments: ReflectType[] = ctx.checker.getTypeArguments(<ts.TypeReference>type)
    .map((t) => toRunType(t, ctx))

  let baseObjectFlag = type.objectFlags - ts.ObjectFlags.Reference
  let name = type.symbol && type.symbol.name

  switch (baseObjectFlag) {

    case 0: // objectFlags == ts.ObjectFlags.Reference

      // special case for Arrays and Map
      // TODO: figure out if there is a way to recognize not by name
      // TODO: better to create a special Kind ?
      if (~KNOWN_REFERENCE.indexOf(name))
        return {
          kind: Kind.Reference,
          type: {runTypeInjectReferenceName: name},
          typeArguments: typeArguments,
        }

      const typeArgumentsMapping = new Map<number, ReflectType>()
      ctx.checker.getTypeArguments(type.target).forEach((t, i) => {
        // @ts-ignore
        typeArgumentsMapping.set(t.id, typeArguments[i])
      })

      ctx = { ...ctx, typeArgumentsMapping }
      return referenceObjectTypeToRunType(toRunType, ctx, type.target);

    // Parameterized interface
    case ts.ObjectFlags.Interface:
      return {
        kind: Kind.Interface,
        name: name,
        members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
      }

    case ts.ObjectFlags.Class:
      if (!ts.isClassDeclaration(type.symbol.valueDeclaration)) throw new Error('class without class declaration')

      // TODO: test extends
      // console.log("checkerBaseTypes", ctx.checker.getBaseTypes(type as unknown as ts.InterfaceType))
      let clauses = type.symbol.valueDeclaration.heritageClauses as ts.NodeArray<ts.HeritageClause>
      let [implementedInterfaces, extendedClass] = extractHeritageClauses(toRunType, ctx, clauses);

      return {
        kind: Kind.Class,
        typeArguments: [],
        implements: implementedInterfaces,
        extends: extendedClass,
        classReference: { runTypeInjectReferenceName: name },
        name: name,
        members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
      }

    case ts.ObjectFlags.Tuple:
      return {
        kind: Kind.Tuple,
        typeArguments: ctx.checker.getTypeArguments(type).map((t) => toRunType(t, ctx)),
      }

    default:
      const flag = ts.ObjectFlags[baseObjectFlag] || baseObjectFlag
      throw new Error('NotImplementedYet: unknown baseObjectFlag ' + flag)
  }

}

function objectTypeToRunType(toRunType: ToRunType, ctx: Context, type: ts.ObjectType): ReflectType {
  const symbol = type.getSymbol()
  const name = symbol && symbol.getName()

  // ts.ObjectFlags above 2 << 17 are internals, let's drop them
  let objectFlags = type.objectFlags & 0x1FFFF

  if (objectFlags & ts.ObjectFlags.Reference)
    return referenceObjectTypeToRunType(toRunType, ctx, type as ts.TypeReference)

  if (objectFlags & ts.ObjectFlags.FreshLiteral)
    objectFlags = objectFlags - ts.ObjectFlags.FreshLiteral

  switch (objectFlags) {

    case ts.ObjectFlags.Interface:
      return {
        kind: Kind.Interface,
        name: name,
        members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
      }

    case ts.ObjectFlags.Anonymous:
    case ts.ObjectFlags.Anonymous | ts.ObjectFlags.ObjectLiteral:

      let symbolFlags = type.symbol.flags
      let optional = {}
      if (symbolFlags & ts.SymbolFlags.Optional) {
        symbolFlags = symbolFlags - ts.SymbolFlags.Optional
        optional = { optional: true }
      }

      switch (symbolFlags) {

        case ts.SymbolFlags.TypeLiteral:
        case ts.SymbolFlags.ObjectLiteral:
          if (type.getProperties().length)
            return {
              ...optional,
              kind: Kind.Interface,
              name: '',
              members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
            }

          else { /* fallthrough */ }
        case ts.SymbolFlags.Function | ts.SymbolFlags.Transient:
        case ts.SymbolFlags.Function:
        case ts.SymbolFlags.Method:
          return {
            ...optional,
            kind: symbolFlags == ts.SymbolFlags.Method ? Kind.Method : Kind.Function,
            name: name != '__type' ? name : '', // cleanup anonyms
            signatures: ctx.checker.getSignaturesOfType(type, ts.SignatureKind.Call).map((s) => ({
              parameters: symbolArrayToNameTypes(toRunType, ctx, s.getParameters()),
              returnType: toRunType(s.getReturnType(), ctx)
            }))
          }

        default:
          const flag = ts.SymbolFlags[symbolFlags] || symbolFlags
          throw new Error('NotImplementedYet: unknown symbol flag ' + flag)
      }

    default:
      console.log(type);
      const flag = ts.ObjectFlags[objectFlags] || objectFlags
      throw new Error('NotImplementedYet: unknown object flag ' + flag)
  }
}

// boolean are expanded as BooleanLiteral(true) and BooleanLiteral(false)
// in unions
function mergeBooleanLiteralTypes(types: ReflectType[]): ReflectType[] {
  let trueType: ReflectType | null = null
  let falseType: ReflectType | null = null
  types.forEach((t) => {
    if (t.kind === Kind.BooleanLiteral) {
      if (t.value) trueType = t
      else falseType = t
    }
  })
  if (trueType && falseType) return types
    .filter((x) => x != trueType && x != falseType)
    .concat({ kind: Kind.Boolean })

  else return types
}

const NOMEMOTYPES = [
  ts.TypeFlags.Any,
  ts.TypeFlags.Unknown,
  ts.TypeFlags.String,
  ts.TypeFlags.Number,
  ts.TypeFlags.Boolean,
  ts.TypeFlags.Enum,
  ts.TypeFlags.BigInt,
  ts.TypeFlags.ESSymbol,
  ts.TypeFlags.Void,
  ts.TypeFlags.Undefined,
  ts.TypeFlags.Null,
  ts.TypeFlags.Never,
]

/*
function toRunType(ctx: Context, type: ts.Type) {
  // @ts-ignore
  let id: number = type.id

  let existing = id && ctx.transformedMap.get(id)
  if (existing && -1 === NOMEMOTYPES.indexOf(existing.kind)) {
    return existing;
  }

  let ref = { }
  // @ts-ignore TODO figure out how to explain this to typescript
  ctx.transformedMap.set(id, ref)
  let result = toRunTypeNoMemo(ctx, type);
  Object.assign(ref, result)

  return result
}*/

function _toRunType(toRunType: ToRunType, type: ts.Type, ctx: Context): ReflectType {
  const flags = type.flags
  const name = type.symbol && type.symbol.getName()

  switch (flags) {
    case ts.TypeFlags.Any: return { kind: Kind.Any }
    case ts.TypeFlags.Unknown: return { kind: Kind.Unknown }
    case ts.TypeFlags.String: return { kind: Kind.String }
    case ts.TypeFlags.Number: return { kind: Kind.Number }
    case ts.TypeFlags.Boolean: return { kind: Kind.Boolean }
    case ts.TypeFlags.BigInt: return { kind: Kind.BigInt }
    case ts.TypeFlags.Void: return { kind: Kind.Void }
    case ts.TypeFlags.Undefined: return { kind: Kind.Undefined }
    case ts.TypeFlags.Null: return { kind: Kind.Null }
    case ts.TypeFlags.Never: return { kind: Kind.Never }

    // boolean is an union and a boolean
    case ts.TypeFlags.Union | ts.TypeFlags.Boolean:
      return { kind: Kind.Boolean }

    case ts.TypeFlags.Union:
      return {
        name: name,
        kind: Kind.Union,
        types: mergeBooleanLiteralTypes((<ts.UnionType>type).types.map((t) => toRunType(t, ctx)))
      }
    case ts.TypeFlags.Enum:
    case (ts.TypeFlags.Union | ts.TypeFlags.EnumLiteral): // Enum
      const names: string[] = []
      const values: any[] = []
      type.symbol.exports.forEach((symbol) => {
        names.push(symbol.getName())
        let type = ctx.checker.getTypeAtLocation(symbol.valueDeclaration)
        if (type.flags === (ts.TypeFlags.EnumLiteral | ts.TypeFlags.NumberLiteral))
          values.push((<ts.NumberLiteralType>type).value)
      })
      return {
        kind: Kind.Enum,
        name: name,
        names: names,
        values: values
      }
    case ts.TypeFlags.Intersection:
      return {
        name: name,
        kind: Kind.Intersection,
        types: (<ts.IntersectionType>type).types.map((t) => toRunType(t, ctx))
      }
    case ts.TypeFlags.EnumLiteral | ts.TypeFlags.NumberLiteral:
    case ts.TypeFlags.NumberLiteral:
      return {
        kind: Kind.NumberLiteral,
        value: (<ts.NumberLiteralType>type).value
      }
    case ts.TypeFlags.EnumLiteral | ts.TypeFlags.StringLiteral:
    case ts.TypeFlags.StringLiteral:
      return {
        kind: Kind.StringLiteral,
        value: (<ts.StringLiteralType>type).value
      }
    case ts.TypeFlags.BooleanLiteral:
      return {
        kind: Kind.BooleanLiteral,
        // @ts-ignore TODO: how to properly check if type
        // is BooleanLiteral(true) or BooleanLiteral(false)
        value: type.intrinsicName === 'true'
      }
    case ts.TypeFlags.BigIntLiteral: return {
      kind: Kind.BigIntLiteral,
      value: (<ts.BigIntLiteralType>type).value
    }
    case ts.TypeFlags.Object:
      return objectTypeToRunType(toRunType, ctx, <ts.ObjectType>type);

    case ts.TypeFlags.TypeParameter:
      let t = (<ts.TypeParameter>type)
      // @ts-ignore
      const mapped = ctx.typeArgumentsMapping && ctx.typeArgumentsMapping.get(t.id)
      if (mapped) return mapped
      return { kind: Kind.TypeParameter, name: t.symbol && t.symbol.name }

    default:
      throw new Error('NotImplementedYet: unknown flag ' + type.flags + ' ' + ts.TypeFlags[type.flags] || '')
  }
}



type CircularMarker = ReflectType & { kind: Kind.Unknown }
function makeLiteralFromNode(checker: ts.TypeChecker, node: ts.Node): ts.Expression {
  if (!node) return ts.createObjectLiteral([]);

  const tstype = checker.getTypeAtLocation(node);
  const ctx = {
    checker: checker,
    // transformedMap: new Map()
  }

  const reflectType = Y(circularHandler({
    shouldMemo: (t: ts.Type, _: Context) => NOMEMOTYPES.indexOf(t.flags) === -1,
    // @ts-ignore
    keyMaker: (t: ts.Type): number => t.id,
    circularMarker: (): CircularMarker => ({ kind: Kind.Unknown }),
    replaceMarker: (m: CircularMarker, r) => Object.assign(m, r)
  }, _toRunType))(tstype, ctx)

  return toLitteral(reflectType);
}

const indexJs = path.join(__dirname, '..', 'lib', 'index.js');
function isTsTransformerReflectImportExpression(node: ts.Node): node is ts.ImportDeclaration {
  if (!ts.isImportDeclaration(node)) {
    return false;
  }
  const module = (node.moduleSpecifier as ts.StringLiteral).text;
  try {
    return indexJs === (
      module.startsWith('.')
        ? require.resolve(path.resolve(path.dirname(node.getSourceFile().fileName), module))
        : require.resolve(module)
    );
  } catch (e) {
    return false;
  }
}

const indexTs = path.join(__dirname, '..', 'src', 'index.ts');
const indexDTs = path.join(__dirname, '..', 'lib', 'index.d.ts');
function isReflectCallExpression(node: ts.CallExpression, typeChecker: ts.TypeChecker): string | false {

  // console.log('call', node.expression.getText(), node.getSourceFile().fileName)

  const signature = typeChecker.getResolvedSignature(node)

  // if('reflect' === node.expression.getText()) console.log(signature, signature && signature.declaration)
  if (typeof signature === 'undefined') return false

  const { declaration } = signature

  // if(declaration.name.getText() === 'reflect') console.log("BAD IMPORT?",declarationSource)

  if (!declaration) return false
  if (ts.isJSDocSignature(declaration)) return false
  if (!declaration.name) return false

  let declarationSource = path.resolve(declaration.getSourceFile().fileName)

  if (declarationSource === indexTs || declarationSource === indexDTs) return declaration.name.getText()

  // try again with realpath to support npm link
  declarationSource = realpathSync(declarationSource)

  if (declarationSource !== indexTs && declarationSource !== indexDTs) return false

  return declaration.name.getText()
}

const metadataHelper = {
  name: "reflect:withReflectMetadata",
  importName: "__withReflectMetadata",
  scoped: false,
  priority: 3,
  text: `
      var __withReflectMetadata = (this && this.__withReflectMetadata) || function (k, v, t) {
          if (typeof Reflect === "object" && typeof Reflect.defineMetadata === "function") Reflect.defineMetadata(k, v, t);
          return t;
      };`
};

const symbolPropertyHelper = {
  name: "reflect:withReflectProperty",
  importName: "__withReflectProperty",
  scoped: false,
  priority: 3,
  text: `
      var __withReflectProperty = (this && this.__withReflectProperty) || function (k, v, t) {
          if (typeof Object === "object" && typeof Object.defineProperty === "function") Object.defineProperty(t, Symbol.for(k), {value: v, enumerable: false, writable: false, configurable: false, });
          return t;
      };`
};

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
  return ts.visitEachChild(visitNode(node, program, context), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined | ts.Node[] {

  if (isTsTransformerReflectImportExpression(node)) {
    return; // delete import
  }

  if (!ts.isCallExpression(node)) {
    return node
  }

  const typeChecker = program.getTypeChecker();
  // @ts-ignore TODO remove me
  typeChecker[util.inspect.custom] = () => "{thechecker}"

  const whichFunction = isReflectCallExpression(node, typeChecker)
  if (!whichFunction) return node;

  const typeTarget = (node.typeArguments && node.typeArguments[0]) || node.arguments[0]
  const typeDefinitionLiteral = makeLiteralFromNode(typeChecker, typeTarget);

  // directly replace the function call with the type
  if (whichFunction === 'reflect') return typeDefinitionLiteral

  // use the helper to set Reflect.metadata from reflect-metadata module
  if (whichFunction === 'reflected') {
    context.requestEmitHelper(metadataHelper);
    return ts.createCall(
      ts.createIdentifier(metadataHelper.importName),
    /*typeArguments*/ undefined,
      [
        ts.createStringLiteral(REFLECT_TYPE),
        typeDefinitionLiteral,
        ...node.arguments
      ]
    );
  }

  // use the helper to set the types as a hidden property on the object itself
  if (whichFunction == 'withReflectProperty') {
    context.requestEmitHelper(symbolPropertyHelper);
    return ts.createCall(
      ts.createIdentifier(symbolPropertyHelper.importName),
    /*typeArguments*/ undefined,
      [
        ts.createStringLiteral(REFLECT_TYPE),
        typeDefinitionLiteral,
        ...node.arguments
      ]
    );
  }

  return ts.createThrow(
    ts.createNew(
      ts.createIdentifier('Error'),
      /*typeArguments*/ undefined,
      [ts.createStringLiteral(whichFunction + ' is not exported by ts-transformer-reflect (did you mean reflect or withReflectMetadata)')]
    )
  );
}

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}