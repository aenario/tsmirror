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
    // literals
    StringLiteral = "stringliteral",
    NumberLiteral = "numberliteral",
    BooleanLiteral = "booleanliteral",
    EnumLiteral = "enumliteral",
    BigIntLiteral = "bigintliteral",
    // function returns types
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

interface Common { reflecttypeid: number, kind: Kind }

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

// TODO: probably need more test
interface TypeParameterType extends Common { kind: Kind.TypeParameter, name: string }

// Literal types

interface Literal extends Common { value: any }
interface StringLiteralType extends Literal { kind: Kind.StringLiteral, value: string }
interface NumberLiteralType extends Literal { kind: Kind.NumberLiteral, value: number }
interface BooleanLiteralType extends Literal { kind: Kind.BooleanLiteral, value: boolean }
interface BigIntLiteralType extends Literal {
    kind: Kind.BigIntLiteral,
    value: { negative: boolean; base10Value: string; }
}


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

interface Signature<Refs> {
    parameters: BaseNameAndType<Refs>[],
    returnType: BaseReflectType<Refs>
}
interface FunctionLike<Refs> extends Common {
    name: string,
    signatures: Signature<Refs>[]
}
interface ObjectLike<Refs> extends Common {
    typeArguments?: BaseReflectType<Refs>[]
    members: BaseNameAndType<Refs>[],
}

// Todo: handle this argument
interface FunctionType<Refs> extends FunctionLike<Refs> { kind: Kind.Function }
interface ClassType<Refs> extends ObjectLike<Refs> {
    reflecttypeid: number,
    kind: Kind.Class,
    name: string,
    constructorSignatures: Signature<Refs>[],
    classReference?: Refs,
    sourceFile?: string,
    implements: BaseReflectType<Refs>[] // TODO: should be InterfaceType[]
    extends: BaseReflectType<Refs>[] // TODO: should be ClassType[]
}

// TODO: mix method into function and Object|Class|Interface ?
interface InterfaceType<Refs> extends ObjectLike<Refs> { kind: Kind.Interface, name: string, extends: BaseReflectType<Refs>[] }
interface MethodType<Refs> extends FunctionLike<Refs> { kind: Kind.Method, name: string }
interface ObjectType<Refs> extends ObjectLike<Refs> { kind: Kind.Object }

interface UnionType<Refs> extends Common {
    name: string,
    kind: Kind.Union
    types: BaseReflectType<Refs>[]
}

interface ReferenceType<Refs> extends Common {
    kind: Kind.Reference,
    type: Refs
    typeArguments: BaseReflectType<Refs>[]
}

interface TupleType<Refs> extends Common {
    kind: Kind.Tuple,
    typeArguments: BaseReflectType<Refs>[]
}

// Nothing is tested below
// TODO: probably should compute intersection instead
interface IntersectionType<Refs> extends Common {
    name: string,
    kind: Kind.Intersection,
    types: BaseReflectType<Refs>[]
}
interface IndexType extends Common { kind: Kind.Index }
interface IndexedAccessType<Refs> extends Common {
    kind: Kind.IndexedAccess,
    objectType: BaseReflectType<Refs>,
    indexType: BaseReflectType<Refs>
}
interface ConditionalType<Refs> extends Common { 
    kind: Kind.Conditional 
    checkType: BaseReflectType<Refs>,
    trueType: BaseReflectType<Refs>,
    falseType: BaseReflectType<Refs>,
    extendsType: BaseReflectType<Refs>
}
interface SubstitutionType extends Common { kind: Kind.Substitution }
interface NonPrimitiveType extends Common { kind: Kind.NonPrimitive }

export const REFLECT_TYPE = 'ts-transformer-reflect:type'

type BaseReflectType<Refs> =
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
    ObjectType<Refs> |
    FunctionType<Refs> |
    ClassType<Refs> |
    InterfaceType<Refs> |
    MethodType<Refs> |
    ObjectType<Refs> |
    ClassType<Refs> |
    ReferenceType<Refs> |
    UnionType<Refs> |
    TupleType<Refs> |
    IntersectionType<Refs> |
    IndexType |
    IndexedAccessType<Refs> |
    ConditionalType<Refs> |
    SubstitutionType |
    NonPrimitiveType


export interface InternalInjectedReference { runTypeInjectReferenceName: string }
export type InternalSignature = Signature<InternalInjectedReference>
export type InternalReflectType = BaseReflectType<InternalInjectedReference>
export type InternalNameAndType = BaseNameAndType<InternalInjectedReference>
export type ReflectType = BaseReflectType<Function>
export type NameAndType = BaseNameAndType<Function>