import * as ts from 'typescript'
import reflectTransformer from '@tsmirror/reflect/lib/transformer'

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>{
    return reflectTransformer(program)
}