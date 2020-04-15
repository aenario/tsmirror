export enum Kind {
    Any = "any",
    Unknown = "unknown",
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Enum = "enum",
    BigInt = "bigint",
    ESSymbol = "essymbol",
    UniqueESSymbol = "uniqueessymbol",
    StringLiteral = "stringliteral",
    NumberLiteral = "numberliteral",
    BooleanLiteral = "booleanliteral",
    EnumLiteral = "enumliteral",
    BigIntLiteral = "bigintliteral",
    Void = "void",
    Undefined = "undefined",
    Null = "null",
    Never = "never",
    TypeParameter = "typeparameter",
    Object = "object",
    Union = "union",
    Intersection = "intersection",
    Index = "index",
    IndexedAccess = "indexedaccess",
    Conditional = "conditional",
    Substitution = "substitution",
    NonPrimitive = "nonprimitive",
    Function = "function",
    Class = "class",
    Interface = "interface",
    Reference = "reference",
    Tuple = "tuple",
}

export interface InternalInjectedReference { runTypeInjectReferenceName: string }
type Ref = Function | InternalInjectedReference

interface Common { reflecttypeid: number }

// Scalar types
interface AnyType extends Common { kind: Kind.Any }
interface UnknownType extends Common { kind: Kind.Unknown }
interface StringType extends Common { kind: Kind.String }
interface NumberType extends Common { kind: Kind.Number }
interface BooleanType extends Common { kind: Kind.Boolean }
interface VoidType extends Common { kind: Kind.Void }
interface UndefinedType extends Common { kind: Kind.Undefined }
interface NullType extends Common { kind: Kind.Null }
interface NeverType extends Common { kind: Kind.Never }
interface BigIntType extends Common { kind: Kind.BigInt }

// Literal types
interface LiteralType extends Common { value: any }
interface StringLiteralType extends LiteralType { kind: Kind.StringLiteral, value: string }
interface NumberLiteralType extends LiteralType { kind: Kind.NumberLiteral, value: number }
interface BooleanLiteralType extends LiteralType { kind: Kind.BooleanLiteral, value: boolean }
interface BigIntLiteralType extends LiteralType {
    kind: Kind.BigIntLiteral,
    value: { negative: boolean; base10Value: string; }
}

interface TypeParameterType extends Common { kind: Kind.TypeParameter, name: string }

// TODO: can we get a symbol name ?
interface ESSymbolType extends Common { kind: Kind.ESSymbol }
interface UniqueESSymbolType extends Common { kind: Kind.UniqueESSymbol }

interface EnumType extends Common {
    kind: Kind.Enum,
    name: string
    names: string[],
    values: string[] | number[]
}
interface EnumLiteralType extends Common {
    kind: Kind.EnumLiteral,
    valueName: string,
    value: any
}

export interface Signature {
    thisType?: ReflectType
    parameters: {
        name: string,
        type: ReflectType,
        rest?: true,
        default?: ReflectType
    }[],
    returnType: ReflectType
}
interface FunctionType extends Common {
    kind: Kind.Function
    name: string,
    signatures: Signature[]
}

interface ObjectLike extends Common {
    typeArguments?: ReflectType[]
    members: {name: string, type: ReflectType}[],
}
interface ClassType extends ObjectLike {
    kind: Kind.Class,
    name: string,
    constructorSignatures: Signature[],
    classReference?: Ref,
    sourceFile?: string,
    implements: ReflectType[] // TODO: should be InterfaceType[]
    extends: ReflectType[] // TODO: should be ClassType[]
}

interface InterfaceType extends ObjectLike {
    kind: Kind.Interface,
    name: string,
    extends: ReflectType[]
}
interface ObjectType extends ObjectLike {
    kind: Kind.Object
}

interface UnionType extends Common {
    kind: Kind.Union
    name: string
    types: ReflectType[]
}

interface ReferenceType extends Common {
    kind: Kind.Reference
    type: Ref
    typeArguments: ReflectType[]
}

interface TupleType extends Common {
    kind: Kind.Tuple,
    typeArguments: ReflectType[]
}

// Nothing is tested below
// TODO: probably should compute intersection instead
interface IntersectionType extends Common {
    kind: Kind.Intersection,
    name: string,
    types: ReflectType[]
}
interface IndexType extends Common {
    kind: Kind.Index
}
interface IndexedAccessType extends Common {
    kind: Kind.IndexedAccess,
    objectType: ReflectType
    indexType: ReflectType
}
interface ConditionalType extends Common {
    kind: Kind.Conditional
    checkType: ReflectType
    trueType: ReflectType
    falseType: ReflectType
    extendsType: ReflectType
}
interface SubstitutionType extends Common {
    kind: Kind.Substitution
}
interface NonPrimitiveType extends Common {
    kind: Kind.NonPrimitive
}

export const REFLECT_TYPE = 'tsmirror-reflect:type'
export const REFLECTING_STRING = 'tsmirror-reflect:reflecting'
export const REFLECT_TYPE_SYMBOL = Symbol.for(REFLECT_TYPE)
export const REFLECTING_SYMBOL = Symbol.for(REFLECTING_STRING)

export type Reflecting<FN extends (...args: any[]) => any> = FN & { [REFLECTING_SYMBOL]: true }

export type ReflectType =
    AnyType |
    UnknownType |
    StringType |
    NumberType |
    BooleanType |
    EnumType |
    BigIntType |
    StringLiteralType |
    NumberLiteralType |
    BooleanLiteralType |
    EnumLiteralType |
    BigIntLiteralType |
    ESSymbolType |
    UniqueESSymbolType |
    VoidType |
    UndefinedType |
    NullType |
    NeverType |
    TypeParameterType |
    ObjectType |
    FunctionType |
    ClassType |
    InterfaceType |
    ObjectType |
    ReferenceType |
    UnionType |
    TupleType |
    IntersectionType |
    IndexType |
    IndexedAccessType |
    ConditionalType |
    SubstitutionType |
    NonPrimitiveType

export type WithKind<RT, K> = RT extends { kind: K } ? RT : never

export type ReflectTypeOf<T> =
  T extends Function ? WithKind<ReflectType, Kind.Function>
: T extends Object ? WithKind<ReflectType, Kind.Object|Kind.Interface|Kind.Class>
: ReflectType

export interface InternalInjectedReference { runTypeInjectReferenceName: string }