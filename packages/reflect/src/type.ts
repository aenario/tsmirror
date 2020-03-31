export enum Kind {
    Any = "any",
    Unknown = "unknown",
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Enum = "enum",
    BigInt = "bigint",
    StringLiteral = "stringliteral",
    NumberLiteral = "numberliteral",
    BooleanLiteral = "booleanliteral",
    EnumLiteral = "enumliteral",
    BigIntLiteral = "bigintliteral",
    ESSymbol = "essymbol",
    // UniqueESSymbol = "uniqueessymbol",
    Void = "void",
    Undefined = "undefined",
    Null = "null",
    Never = "never",
    TypeParameter = "typeparameter",
    Object = "object",
    Union = "union",
    Intersection = "intersection",
    // Index = "index",
    // IndexedAccess = "indexedaccess",
    // Conditional = "conditional",
    // Substitution = "substitution",
    // NonPrimitive = "nonprimitive",

    Function = "function",
    Class = "class",
    Interface = "interface",
    Method = "method",

    Reference = "reference",
    Tuple = "tuple",
}

interface BaseNameAndType<InjectedReference> {
    name: string,
    type: BaseReflectType<InjectedReference>,
    rest?: true,
    default?: BaseReflectType<InjectedReference>
}

// Scalar types
interface AnyType { kind: Kind.Any }
interface UnknownType { kind: Kind.Unknown }
interface StringType { kind: Kind.String }
interface NumberType { kind: Kind.Number }
interface BooleanType { kind: Kind.Boolean }
interface VoidType { kind: Kind.Void }
interface UndefinedType { kind: Kind.Undefined }
interface NullType { kind: Kind.Null }
interface NeverType { kind: Kind.Never }
interface BigIntType { kind: Kind.BigInt }

// TODO: probably need more test
interface TypeParameterType { kind: Kind.TypeParameter, name: string }

// Literal types
interface StringLiteralType { kind: Kind.StringLiteral, value: string }
interface NumberLiteralType { kind: Kind.NumberLiteral, value: number }
interface BooleanLiteralType { kind: Kind.BooleanLiteral, value: boolean }
interface BigIntLiteralType {
    kind: Kind.BigIntLiteral, value: {
        negative: boolean;
        base10Value: string;
    }
}

// TODO: test & see what to add
interface ESSymbolType { kind: Kind.ESSymbol, value: symbol }

// interface UniqueESSymbolType { kind: Kind.UniqueESSymbol, value: symbol }

interface EnumType {
    kind: Kind.Enum,
    name: string
    names: string[],
    values: string[] | number[]
}
interface EnumLiteralType {
    kind: Kind.EnumLiteral,
    valueName: string,
    value: any
}
interface Signature<InjectedReference> {
    parameters: BaseNameAndType<InjectedReference>[],
    returnType: BaseReflectType<InjectedReference>
}
interface FunctionLike<InjectedReference> {
    name: string,
    signatures: Signature<InjectedReference>[]
}
interface ObjectLike<InjectedReference> {
    typeArguments?: BaseReflectType<InjectedReference>[]
    members: BaseNameAndType<InjectedReference>[],
}

// Todo: handle this argument
interface FunctionType<InjectedReference> extends FunctionLike<InjectedReference> { kind: Kind.Function }
interface ClassType<InjectedReference> extends ObjectLike<InjectedReference> {
    kind: Kind.Class,
    name: string,
    classReference: InjectedReference,
    implements: BaseReflectType<InjectedReference>[] // TODO: should be InterfaceType[]
    extends: BaseReflectType<InjectedReference>[] // TODO: should be ClassType[]
}

// TODO: mix method into function and Object|Class|Interface ?
interface InterfaceType<InjectedReference> extends ObjectLike<InjectedReference> { kind: Kind.Interface, name: string }
interface MethodType<InjectedReference> extends FunctionLike<InjectedReference> { kind: Kind.Method, name: string }
interface ObjectType<InjectedReference> extends ObjectLike<InjectedReference> { kind: Kind.Object }

interface UnionType<InjectedReference> {
    name: string,
    kind: Kind.Union
    types: BaseReflectType<InjectedReference>[]
}

interface ReferenceType<InjectedReference> {
    kind: Kind.Reference,
    type: InjectedReference
    typeArguments: BaseReflectType<InjectedReference>[]
}

interface TupleType<InjectedReference> {
    kind: Kind.Tuple,
    typeArguments: BaseReflectType<InjectedReference>[]
}

// Nothing is tested below
// TODO: probably should compute intersection instead
interface IntersectionType<InjectedReference> {
    name: string,
    kind: Kind.Intersection,
    types: BaseReflectType<InjectedReference>[]
}
// interface IndexType { kind: Kind.Index }
// interface IndexedAccessType { kind: Kind.IndexedAccess }
// interface ConditionalType { kind: Kind.Conditional }
// interface SubstitutionType { kind: Kind.Substitution }
// interface NonPrimitiveType { kind: Kind.NonPrimitive }

export const REFLECT_TYPE = 'ts-transformer-reflect:type'

type BaseReflectType<InjectedReference> =
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
    VoidType |
    UndefinedType |
    NullType |
    NeverType |
    TypeParameterType |
    ObjectType<InjectedReference> |
    FunctionType<InjectedReference> |
    ClassType<InjectedReference> |
    InterfaceType<InjectedReference> |
    MethodType<InjectedReference> |
    ObjectType<InjectedReference> |
    ClassType<InjectedReference> |
    ReferenceType<InjectedReference> |
    UnionType<InjectedReference> |
    TupleType<InjectedReference> |
    IntersectionType<InjectedReference>
// UniqueESSymbolType |
// IndexType |
// IndexedAccessType |
// ConditionalType |
// SubstitutionType |
// NonPrimitiveType

export interface InternalInjectedReference { runTypeInjectReferenceName: any }
export type InternalReflectType = BaseReflectType<InternalInjectedReference>
export type InternalNameAndType = BaseNameAndType<InternalInjectedReference>
export type ReflectType = BaseReflectType<Function>
export type NameAndType = BaseNameAndType<Function>