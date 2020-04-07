import * as ts from 'typescript'
import * as path from 'path'
import { InternalReflectType as ReflectType, Kind, InternalNameAndType as NameAndType, REFLECT_TYPE, InternalInjectedReference } from './type'
import * as util from 'util';
import { realpathSync } from 'fs-extra';
import { Y, circularHandler } from './circular';
import { toLitteral } from './tolitteral';

interface Context {
  checker: ts.TypeChecker,
  reflectSourceFile: string,
  depth: number,
  typeArgumentsMapping?: Map<number, ReflectType>
}

type ToRunType = (t: ts.Type, ctx: Context) => ReflectType

function typeID(t: ts.Type): number {
  // @ts-ignore Should probably use something else
  return t.id
}

function logFlags(flags: number, x: 'TypeFlags' | 'SymbolFlags' | 'ObjectFlags'): string {
  let out = ''
  for (let i = 0; i <= flags; i = i ? (i << 1) : 1) if (flags & i) {
    // @ts-ignore
    let name = Object.keys(ts[x]).find((k: string) => ts[x][k] == i)
    out += '|' + (name || i)
  }
  return x + '(' + out.substr(1) + ')'
}

// @ts-ignore
const debug = !process.env.REFLECT_DEBUG ? (...args?: any[]) => { } :
  (ctx: Context, ...args: any) => console.log(Array(ctx.depth).fill('').join(' '), ...args)

function symbolArrayToNameTypes(toRunType: ToRunType, ctx: Context, symbols: ts.Symbol[]): NameAndType[] {
  const results: NameAndType[] = [];
  symbols.forEach((symbol) => {
    const t = ctx.checker.getTypeAtLocation(symbol.valueDeclaration)
    const res: NameAndType = { name: symbol.getName(), type: toRunType(t, ctx) }
    if (symbol.valueDeclaration && ts.isParameter(symbol.valueDeclaration)) {
      if (symbol.valueDeclaration.dotDotDotToken) res.rest = true
      if (symbol.valueDeclaration.initializer) res.default = toRunType(ctx.checker.getTypeAtLocation(symbol.valueDeclaration.initializer), ctx)
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

const KNOWN_REFERENCE = {
  'Array': 'Array',
  'Map': 'Map',
  'Set': 'Set',
  'WeakSet': 'WeakSet',
  'WeakMap': 'WeakMap',
  'ReadonlyArray': 'Array',
} as { [key: string]: string }


function interfaceTypetoRunType(toRunType: ToRunType, ctx: Context, type: ts.InterfaceType): ReflectType {
  const symbol = type.getSymbol()
  const name = symbol && symbol.getName()
  const baseTypes = ctx.checker.getBaseTypes(type as unknown as ts.InterfaceType)
  const inheritedProperties = ([] as ts.Symbol[]).concat(...baseTypes.map((x) => x.getProperties()))
  const inheritedPropertiesName: string[] = inheritedProperties.map((s) => s.name)
  debug(ctx, 'interfaceTypetoRunType', typeID(type), name, logFlags(type.objectFlags, 'ObjectFlags'), type.symbol && type.symbol.valueDeclaration && type.symbol.valueDeclaration.getSourceFile().fileName, baseTypes.length, inheritedProperties.length)

  const ownProperties = type.getProperties().filter((symbol) => -1 === inheritedPropertiesName.indexOf(symbol.name))

  return {
    reflecttypeid: typeID(type),
    kind: Kind.Interface,
    extends: baseTypes.map((x) => toRunType(x, ctx)),
    name: name || 'Anonymous',
    members: symbolArrayToNameTypes(toRunType, ctx, ownProperties)
  }
}

function referenceObjectTypeToRunType(toRunType: ToRunType, ctx: Context, type: ts.TypeReference): ReflectType {
  let baseObjectFlag = type.objectFlags - ts.ObjectFlags.Reference
  let name = type.symbol && type.symbol.name
  debug(ctx, 'referenceObjectTypeToRunType', typeID(type), name, logFlags(type.objectFlags, 'ObjectFlags'), type.symbol && type.symbol.valueDeclaration && type.symbol.valueDeclaration.getSourceFile().fileName)

  let typeArguments: ReflectType[] = ctx.checker.getTypeArguments(type)
    .map((t) => toRunType(t, ctx))

  // special case for Arrays and Map
  // TODO: figure out if there is a way to recognize not by name
  // TODO: better to create a special Kind ?
  const known = KNOWN_REFERENCE[name]
  if (known)
    return {
      reflecttypeid: typeID(type),
      kind: Kind.Reference,
      type: { runTypeInjectReferenceName: known },
      typeArguments: typeArguments,
    }

  switch (baseObjectFlag) {
    case 0: // objectFlags == ts.ObjectFlags.Reference
      const typeArgumentsMapping = new Map<number, ReflectType>()
      ctx.checker.getTypeArguments(type.target).forEach((t, i) => {
        typeArgumentsMapping.set(typeID(t), typeArguments[i])
      })

      // Add the type arguments to the context
      ctx = { ...ctx, typeArgumentsMapping }
      return referenceObjectTypeToRunType(toRunType, ctx, type.target);

    // Parameterized interface
    case ts.ObjectFlags.Interface:
      return interfaceTypetoRunType(toRunType, ctx, type as unknown as ts.InterfaceType)

    // All classes are also reference
    case ts.ObjectFlags.Class:
      if (!ts.isClassDeclaration(type.symbol.valueDeclaration)) throw new Error('class without class declaration')

      // TODO: test extends
      // console.log(checkerBaseTypes", ctx.checker.getBaseTypes(type as unknown as ts.InterfaceType))
      let clauses = type.symbol.valueDeclaration.heritageClauses as ts.NodeArray<ts.HeritageClause>
      let [implementedInterfaces, extendedClass] = extractHeritageClauses(toRunType, ctx, clauses);

      // can't get the class reference if it's not from this source file.
      let sameFile = ctx.reflectSourceFile === type.symbol.valueDeclaration.getSourceFile().fileName
      let classReference: InternalInjectedReference = { runTypeInjectReferenceName: name }
      let sourceFile = path.relative(path.dirname(ctx.reflectSourceFile), type.symbol.valueDeclaration.getSourceFile().fileName)

      return {
        ...(sameFile ? { classReference } : { sourceFile }),
        reflecttypeid: typeID(type),
        kind: Kind.Class,
        typeArguments: [],
        implements: implementedInterfaces,
        extends: extendedClass,
        name: name,
        members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
      }

    case ts.ObjectFlags.Tuple:
      return {
        reflecttypeid: typeID(type),
        kind: Kind.Tuple,
        typeArguments: typeArguments,
      }

    default:
      throw new Error('NotImplementedYet: unknown ref ' + logFlags(baseObjectFlag, 'ObjectFlags'))
  }

}

function objectTypeToRunType(toRunType: ToRunType, ctx: Context, type: ts.ObjectType): ReflectType {
  const symbol = type.getSymbol()
  const name = symbol && symbol.getName()
  debug(ctx, 'objectTypeToRunType', typeID(type), name, logFlags(type.objectFlags, 'ObjectFlags'), symbol && logFlags(symbol.flags, 'SymbolFlags'))

  // ts.ObjectFlags above 2 << 17 are internals, let's drop them
  let objectFlags = type.objectFlags & 0x1FFFF

  // more ObjectFlags to drop (for now) 
  if (objectFlags & ts.ObjectFlags.FreshLiteral)
    objectFlags = objectFlags - ts.ObjectFlags.FreshLiteral
  if (objectFlags & ts.ObjectFlags.Instantiated)
    objectFlags = objectFlags - ts.ObjectFlags.Instantiated

  if (objectFlags & ts.ObjectFlags.Reference)
    return referenceObjectTypeToRunType(toRunType, ctx, type as ts.TypeReference)

  switch (objectFlags) {

    case ts.ObjectFlags.Interface:
      return interfaceTypetoRunType(toRunType, ctx, type as ts.InterfaceType)

    case ts.ObjectFlags.Mapped:
    case ts.ObjectFlags.Anonymous:
    case ts.ObjectFlags.Anonymous | ts.ObjectFlags.ObjectLiteral:

      let symbolFlags = type.symbol.flags
      let optional = {}
      if (symbolFlags & ts.SymbolFlags.Optional) {
        symbolFlags = symbolFlags - ts.SymbolFlags.Optional
        optional = { optional: true }
      }

      // @TODO what is this ?
      if (symbolFlags & ts.SymbolFlags.Transient) {
        symbolFlags = symbolFlags - ts.SymbolFlags.Transient
      }

      if (symbolFlags & ts.SymbolFlags.ValueModule) {
        symbolFlags = symbolFlags - ts.SymbolFlags.ValueModule
      }

      switch (symbolFlags) {
        case 0: // ts.SymbolFlags.ValueModule
        case ts.SymbolFlags.Class:  // TODO TEST ME
        case ts.SymbolFlags.Class | ts.SymbolFlags.Interface: // TODO TEST ME
        case ts.SymbolFlags.Class | ts.SymbolFlags.NamespaceModule: // TODO TEST ME
        case ts.SymbolFlags.NamespaceModule:
        case ts.SymbolFlags.TypeLiteral:
        case ts.SymbolFlags.ObjectLiteral:
          if (type.getProperties().length)
            return {
              ...optional,
              reflecttypeid: typeID(type),
              kind: Kind.Interface,
              extends: [],
              name: "",
              members: symbolArrayToNameTypes(toRunType, ctx, type.getProperties())
            }

          else { /* fallthrough */ }
        case ts.SymbolFlags.Function:
        case ts.SymbolFlags.Method:
          return {
            ...optional,
            reflecttypeid: typeID(type),
            kind: symbolFlags == ts.SymbolFlags.Method ? Kind.Method : Kind.Function,
            name: (name && name != '__type') ? name : '', // cleanup anonyms
            signatures: ctx.checker.getSignaturesOfType(type, ts.SignatureKind.Call).map((s) => {
              // @ts-ignore thisParameter is @internal
              const thisType = s.thisParameter && ctx.checker.getTypeAtLocation(s.thisParameter.valueDeclaration)
              return {
                ...(thisType ? { thisType: toRunType(thisType, ctx) } : {}),
                parameters: symbolArrayToNameTypes(toRunType, ctx, s.getParameters()),
                returnType: toRunType(s.getReturnType(), ctx)
              }
            })
          }

        default:
          throw new Error('NotImplementedYet: unknown ' + logFlags(type.symbol.flags, 'SymbolFlags'))
      }

    default:
      throw new Error('NotImplementedYet: unknown ' + logFlags(type.objectFlags, 'ObjectFlags'))
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
    .concat({ reflecttypeid: 0, kind: Kind.Boolean })

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

function _toRunType(toRunType: ToRunType, type: ts.Type, ctx: Context): ReflectType {
  const flags = type.flags
  const name = type.symbol && type.symbol.getName()
  ctx = { ...ctx, depth: ctx.depth + 1 }
  debug(ctx, '_toRunType', typeID(type), logFlags(flags, 'TypeFlags'), name)
  ctx = { ...ctx, depth: ctx.depth + 1 }

  const out: ReflectType = { reflecttypeid: typeID(type), kind: Kind.Unknown }

  if (name == 'TypeChecker') return { reflecttypeid: typeID(type), kind: Kind.Unknown } // TODO remove me

  switch (flags) {
    case ts.TypeFlags.Any: return { ...out, kind: Kind.Any }
    case ts.TypeFlags.Unknown: return { ...out, kind: Kind.Unknown }
    case ts.TypeFlags.String: return { ...out, kind: Kind.String }
    case ts.TypeFlags.Number: return { ...out, kind: Kind.Number }
    case ts.TypeFlags.Boolean: return { ...out, kind: Kind.Boolean }
    case ts.TypeFlags.BigInt: return { ...out, kind: Kind.BigInt }
    case ts.TypeFlags.Void: return { ...out, kind: Kind.Void }
    case ts.TypeFlags.Undefined: return { ...out, kind: Kind.Undefined }
    case ts.TypeFlags.Null: return { ...out, kind: Kind.Null }
    case ts.TypeFlags.Never: return { ...out, kind: Kind.Never }
    case ts.TypeFlags.ESSymbol: return { ...out, kind: Kind.ESSymbol }
    case ts.TypeFlags.UniqueESSymbol: return { ...out, kind: Kind.UniqueESSymbol }
    case ts.TypeFlags.NonPrimitive: return { ...out, kind: Kind.NonPrimitive }
    case ts.TypeFlags.Conditional:
      return {
        ...out,
        kind: Kind.Conditional,
        checkType: toRunType((<ts.ConditionalType>type).checkType, ctx),
        trueType: toRunType((<ts.ConditionalType>type).root.trueType, ctx),
        falseType: toRunType((<ts.ConditionalType>type).root.falseType, ctx),
        extendsType: toRunType((<ts.ConditionalType>type).extendsType, ctx)
      }

    // boolean is an union and a boolean
    case ts.TypeFlags.Union | ts.TypeFlags.Boolean:
      return { reflecttypeid: typeID(type), kind: Kind.Boolean }

    case ts.TypeFlags.Union:
      return {
        reflecttypeid: typeID(type),
        name: name,
        kind: Kind.Union,
        types: mergeBooleanLiteralTypes((<ts.UnionType>type).types.map((t) => toRunType(t, ctx)))
      }
    case ts.TypeFlags.Enum:
    case (ts.TypeFlags.Union | ts.TypeFlags.EnumLiteral): // Enum
      const names: string[] = []
      const values: any[] = []
      type.symbol && type.symbol.exports && type.symbol.exports.forEach((symbol) => {
        names.push(symbol.getName())
        let type = ctx.checker.getTypeAtLocation(symbol.valueDeclaration)
        if (type.flags === (ts.TypeFlags.EnumLiteral | ts.TypeFlags.NumberLiteral))
          values.push((<ts.NumberLiteralType>type).value)
      })
      return {
        reflecttypeid: typeID(type),
        kind: Kind.Enum,
        name: name,
        names: names,
        values: values
      }
    case ts.TypeFlags.Intersection:
      return {
        reflecttypeid: typeID(type),
        name: name,
        kind: Kind.Intersection,
        types: (<ts.IntersectionType>type).types.map((t) => toRunType(t, ctx))
      }
    case ts.TypeFlags.EnumLiteral | ts.TypeFlags.NumberLiteral:
    case ts.TypeFlags.NumberLiteral:
      return {
        reflecttypeid: typeID(type),
        kind: Kind.NumberLiteral,
        value: (<ts.NumberLiteralType>type).value
      }
    case ts.TypeFlags.EnumLiteral | ts.TypeFlags.StringLiteral:
    case ts.TypeFlags.StringLiteral:
      return {
        reflecttypeid: typeID(type),
        kind: Kind.StringLiteral,
        value: (<ts.StringLiteralType>type).value
      }
    case ts.TypeFlags.BooleanLiteral:
      return {
        reflecttypeid: typeID(type),
        kind: Kind.BooleanLiteral,
        // @ts-ignore TODO: how to properly check if type
        // is BooleanLiteral(true) or BooleanLiteral(false)
        value: type.intrinsicName === 'true'
      }
    case ts.TypeFlags.BigIntLiteral: return {
      reflecttypeid: typeID(type),
      kind: Kind.BigIntLiteral,
      value: (<ts.BigIntLiteralType>type).value
    }
    case ts.TypeFlags.Object:
      return objectTypeToRunType(toRunType, ctx, <ts.ObjectType>type);

    case ts.TypeFlags.TypeParameter:
      const mapped = ctx.typeArgumentsMapping && ctx.typeArgumentsMapping.get(typeID(type))
      if (mapped) return mapped

      // @TODO: throw ?
      let t = (<ts.TypeParameter>type)
      return { reflecttypeid: typeID(type), kind: Kind.TypeParameter, name: t.symbol && t.symbol.name }

    // still not sure what this is
    case ts.TypeFlags.IndexedAccess:
      return {
        reflecttypeid: typeID(type),
        indexType: toRunType((<ts.IndexedAccessType>type).indexType, ctx),
        objectType: toRunType((<ts.IndexedAccessType>type).objectType, ctx),
        kind: Kind.IndexedAccess
      }

    case ts.TypeFlags.Index:
      debug('REPORTME: Index', type)
      return { reflecttypeid: typeID(type), kind: Kind.Index }

    default:
      throw new Error('NotImplementedYet: unknown ' + logFlags(type.flags, 'TypeFlags'))
  }
}

type CircularMarker = ReflectType & { kind: Kind.Unknown }
function makeLiteralFromNode(checker: ts.TypeChecker, node: ts.Node): ts.Expression {
  if (!node) return ts.createObjectLiteral([]);

  const tstype = checker.getTypeAtLocation(node);
  const ctx = {
    reflectSourceFile: node.getSourceFile().fileName,
    checker: checker,
    depth: 0
  }

  const reflectType = Y(circularHandler({
    shouldMemo: (t: ts.Type, _: Context) => NOMEMOTYPES.indexOf(t.flags) === -1,
    // @ts-ignore
    keyMaker: (t: ts.Type): number => t.id,
    circularMarker: (t: ts.Type): CircularMarker => ({ reflecttypeid: typeID(t), kind: Kind.Unknown }),
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

  const signature = typeChecker.getResolvedSignature(node)

  if (typeof signature === 'undefined') return false

  const { declaration } = signature

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