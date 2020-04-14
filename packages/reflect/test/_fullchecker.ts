import { reflect } from "../src/index";
import * as ts from 'typescript'

reflect<ts.TypeChecker>()
reflect<ts.Program>()
reflect<ts.CompilerHost>()
reflect<Node>() // DOM Node
reflect<ArrayBuffer>()
reflect<Promise<Response>>()