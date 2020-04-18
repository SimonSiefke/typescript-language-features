import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript/lib/typescript'
import {
  CompletionItemKind,
  CompletionList,
  InitializeResult,
  InsertTextFormat,
  TextDocumentSyncKind,
  TextEdit,
} from 'vscode-languageserver'
import { connectionProxy } from './api/connectionProxy'
import { documentsProxy } from './api/documentsProxy'

process.on('unhandledRejection', console.error)
process.on('uncaughtException', console.error)

const initializeResult: InitializeResult = {
  capabilities: {
    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '*'],
    },
    textDocumentSync: {
      openClose: true,
      change: TextDocumentSyncKind.Incremental,
    },
  },
  serverInfo: {
    name: 'TypeScript Language Features',
    version: process.env.VERSION || '0.0.0-development',
  },
}

let intellicodePath: string | undefined

connectionProxy.onInitialize = ({ initializationOptions }) => {
  intellicodePath = initializationOptions.intellicodePath
  console.log(initializationOptions)
  return initializeResult
}

type IntellicodeModelJson = {
  languageName: string
  filePath: string
}[]

type TypescriptLanguageServicePlugin = (modules: {
  typescript: typeof import('typescript/lib/tsserverlibrary')
}) => {
  create: (info: any) => ts.LanguageService
}

export const createIntellicodePlugin: (
  intellicodePath: string | undefined
) =>
  | { plugin: TypescriptLanguageServicePlugin; modelPath: string }
  | undefined = (intellicodePath) => {
  if (!intellicodePath) {
    return undefined
  }
  const intellicodePluginPath = path.join(
    intellicodePath,
    'node_modules/@vsintellicode/typescript-intellicode-plugin/lib/index.js'
  )
  const modelJsonPath = path.join(intellicodePath, 'cache/models.json')
  if (!fs.existsSync(intellicodePluginPath) || !fs.existsSync(modelJsonPath)) {
    return undefined
  }
  const intellicode = require(intellicodePluginPath) as TypescriptLanguageServicePlugin
  const modelJson = require(modelJsonPath) as IntellicodeModelJson
  const jsModel = modelJson.find((model) => model.languageName === 'javascript')
  if (!jsModel) {
    return undefined
  }
  return {
    plugin: intellicode,
    modelPath: jsModel.filePath,
  }
  // jsModel.filePath
  // console.log(JSON.stringify(modelJson))
  // console.log('GOT INTELLICODE')
}

const withIntellicode: (
  languageService: ts.LanguageService,
  languageServiceHost: ts.LanguageServiceHost,
  intellicodePath: string | undefined
) => ts.LanguageService = (
  languageService,
  languageServiceHost,
  intellicodePath
) => {
  if (!intellicodePath) {
    return languageService
  }
  const intellicode = createIntellicodePlugin(intellicodePath)

  if (!intellicode) {
    return languageService
  }
  const info: any = {
    languageService,
    languageServiceHost,
    serverHost: undefined as any,
    project: undefined as any,
    config: {
      modelPath: intellicode.modelPath,
    },
  }
  console.log('ENABLED INTELLICODE')
  return intellicode.plugin({ typescript: ts as any }).create(info)
}

const createTypescriptLanguageService = (absolutePath: string) => {
  const configFilePath = ts.findConfigFile(
    absolutePath,
    ts.sys.fileExists,
    'tsconfig.json'
  )

  const configJson = ts.readConfigFile(
    configFilePath as string,
    ts.sys.readFile
  ).config

  const parsedConfig = ts.parseJsonConfigFileContent(
    configJson,
    {
      fileExists: ts.sys.fileExists,
      readDirectory: ts.sys.readDirectory,
      readFile: ts.sys.readFile,
      useCaseSensitiveFileNames: true,
    },
    path.dirname(configFilePath as string),
    {
      allowJs: true,
      checkJs: true,
    },
    configFilePath,
    undefined,
    []
  )

  console.log(parsedConfig.fileNames)
  console.log(parsedConfig.options)

  const scriptSnapshotCache: {
    [key: string]: ts.IScriptSnapshot
  } = Object.create(null)

  const caseSensitiveFileNames = true
  const newLine = '\n'
  const compilationSettings = parsedConfig.options
  // const currentDirectory = path.dirname(configFilePath as string)
  const currentDirectory = ts.sys.getCurrentDirectory()
  console.log('CWD')
  console.log(ts.sys.getCurrentDirectory())
  console.log(currentDirectory)
  const scriptFileNames = parsedConfig.fileNames
  const defaultLibFileName = ts.getDefaultLibFilePath(parsedConfig.options)
  const languageServiceHost: ts.LanguageServiceHost = {
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getDirectories: ts.sys.getDirectories,
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: () => caseSensitiveFileNames,
    getNewLine: () => newLine,
    getCompilationSettings: () => compilationSettings,
    getCurrentDirectory: () => currentDirectory,
    getScriptFileNames: () => scriptFileNames,
    getScriptVersion: (fileName) => {
      if (documentsProxy.hasDocument(`file://${fileName}`)) {
        return documentsProxy
          .getDocument(`file://${fileName}`)
          .version.toString()
      }
      return `0`
    },
    getScriptSnapshot: (fileName) => {
      if (fileName in scriptSnapshotCache) {
        return scriptSnapshotCache[fileName]
      }
      if (documentsProxy.hasDocument(`file://${fileName}`)) {
        return ts.ScriptSnapshot.fromString(
          documentsProxy.getDocument(`file://${fileName}`).getText()
        )
      }
      const scriptSnapshot = ts.ScriptSnapshot.fromString(
        ts.sys.readFile(fileName) as string
      )
      scriptSnapshotCache[fileName] = scriptSnapshot
      return scriptSnapshot
    },
    getDefaultLibFileName: () => defaultLibFileName,
  }
  let languageService = ts.createLanguageService(languageServiceHost)
  // languageService = withIntellicode(
  //   languageService,
  //   languageServiceHost,
  //   intellicodePath
  // )
  return languageService
}

const getCompletionItemKind: (
  kind: ts.ScriptElementKind
) => CompletionItemKind = (kind) => {
  switch (kind) {
    case ts.ScriptElementKind.primitiveType:
    case ts.ScriptElementKind.keyword:
      return CompletionItemKind.Keyword
    case ts.ScriptElementKind.constElement:
      return CompletionItemKind.Constant
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.alias:
      return CompletionItemKind.Variable
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
      return CompletionItemKind.Field
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.localFunctionElement:
      return CompletionItemKind.Function
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
      return CompletionItemKind.Method
    case ts.ScriptElementKind.enumElement:
      return CompletionItemKind.Enum
    case ts.ScriptElementKind.moduleElement:
    case ts.ScriptElementKind.externalModuleName:
      return CompletionItemKind.Module
    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.typeElement:
      return CompletionItemKind.Class
    case ts.ScriptElementKind.interfaceElement:
      return CompletionItemKind.Interface
    case ts.ScriptElementKind.warning:
    case ts.ScriptElementKind.scriptElement:
      return CompletionItemKind.File
    case ts.ScriptElementKind.directory:
      return CompletionItemKind.Folder
    case ts.ScriptElementKind.string:
      return CompletionItemKind.Constant
    default:
      return CompletionItemKind.Property
  }
}

const getCommitCharacters: (
  tsEntry: ts.CompletionEntry
) => string[] | undefined = (tsEntry) => {
  const commitCharacters: string[] = []
  switch (tsEntry.kind) {
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
    case ts.ScriptElementKind.enumElement:
    case ts.ScriptElementKind.interfaceElement:
      commitCharacters.push('.', ';')
      break
    case ts.ScriptElementKind.moduleElement:
    case ts.ScriptElementKind.alias:
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.keyword:
    case ts.ScriptElementKind.parameterElement:
      commitCharacters.push('.', ',', ';')
      break
  }
  return commitCharacters.length === 0 ? undefined : commitCharacters
}

const toCompletionList: (
  completions: ts.WithMetadata<ts.CompletionInfo>,
  fsPath: string,
  offset: number
) => CompletionList = (completions, fsPath, offset) => {
  const completionList: CompletionList = {
    isIncomplete: false,
    items: completions.entries.map((entry) => {
      const kind = getCompletionItemKind(entry.kind)
      return {
        kind,
        label: entry.name,
        sortText: entry.sortText,
        preselect: entry.isRecommended,
        insertText: entry.insertText,
        data: {
          fsPath,
          offset,
          name: entry.name,
          source: entry.source,
          maybeCompleteFunctionCall:
            kind === CompletionItemKind.Function ||
            kind === CompletionItemKind.Method ||
            kind === CompletionItemKind.Variable ||
            kind === CompletionItemKind.Constant ||
            kind === CompletionItemKind.Field,
        },
        commitCharacters: getCommitCharacters(entry),
      }
    }),
  }
  return completionList
}

let languageService: ts.LanguageService
const getLanguageService = (fsPath: string) => {
  if (!languageService) {
    languageService = createTypescriptLanguageService(fsPath)
  }
  return languageService
}

// const cachePreCompletions: {
//   [uri: string]: {
//     readonly version: number
//     readonly completionList: CompletionList | undefined
//     readonly position: Position
//   }
// } = Object.create(null)

// documentsProxy.onDidChangeTextDocument(
//   (textDocument, oldText, oldDocument, newText, newDocument, changes) => {
//     if (changes.length === 0) {
//       return
//     }
//     const change = changes[0]
//     if (!('range' in change)) {
//       return
//     }
//     const offset = documentsProxy
//       .getDocument(textDocument.uri)
//       .offsetAt(change.range.start)
//     const fsPath = textDocument.uri.slice(7)
//     const typescriptLanguageService = getLanguageService(fsPath)
//     const completions = typescriptLanguageService.getCompletionsAtPosition(
//       fsPath,
//       offset,
//       {
//         includeCompletionsForModuleExports: true,
//         includeCompletionsWithInsertText: true,
//       }
//     )
//     if (!completions) {
//       return completions
//     }
//     const completionList = toCompletionList(completions, fsPath, offset)
//     cachePreCompletions[textDocument.uri] = {
//       version: textDocument.version as number,
//       completionList,
//       position: change.range.end,
//     }
//   }
// )

connectionProxy.onCompletion = ({ textDocument, position }) => {
  // if (
  //   textDocument.uri in cachePreCompletions &&
  //   cachePreCompletions[textDocument.uri].version ===
  //     documentsProxy.getDocument(textDocument.uri).version &&
  //   cachePreCompletions[textDocument.uri].position.line === position.line &&
  //   cachePreCompletions[textDocument.uri].position.character ===
  //     position.character
  // ) {
  //   console.log('CACHE HIT')
  //   return cachePreCompletions[textDocument.uri].completionList
  // }
  const fsPath = textDocument.uri.slice(7)
  const typescriptLanguageService = getLanguageService(fsPath)
  const offset = documentsProxy.getDocument(textDocument.uri).offsetAt(position)
  const completions = typescriptLanguageService.getCompletionsAtPosition(
    fsPath,
    offset,
    {
      includeAutomaticOptionalChainCompletions: true,
      includeCompletionsWithInsertText: true,
      includeCompletionsForModuleExports: true,
    }
  )
  if (!completions) {
    return completions
  }
  return toCompletionList(completions, fsPath, offset)
}

const NULL_FUNCTION_CALL_LIST_PART: ReturnType<typeof getParameterListParts> = {
  hasOptionalParameters: false,
  parts: [],
  isFunctionCall: false,
}

const enum DisplayPartKind {
  functionName = 'functionName',
  methodName = 'methodName',
  parameterName = 'parameterName',
  propertyName = 'propertyName',
  punctuation = 'punctuation',
  text = 'text',
  localName = 'localName',
  aliasName = 'aliasName',
}

const getParameterListParts: (
  displayParts: ts.SymbolDisplayPart[]
) => {
  parts: ts.SymbolDisplayPart[]
  hasOptionalParameters: boolean
  isFunctionCall: boolean
} = (displayParts) => {
  const parts: ts.SymbolDisplayPart[] = []
  let isInMethod = false
  let hasOptionalParameters = false
  let parenCount = 0
  let braceCount = 0
  /**
   * if it is a local variable and there are no parenthesis,
   * it is no function
   */
  let isLocalVariable = false
  let hasSeenParenthesis = false
  /**
   * When there is a curly brace before a parenthesis,
   * then it is an object
   */
  let firstBraceIndex = -1
  let firstParenthesisIndex = -1

  let i = 0
  if (
    displayParts[0].kind === DisplayPartKind.punctuation &&
    displayParts[0].text === '(' &&
    displayParts[1].kind === DisplayPartKind.text &&
    displayParts[1].text === 'alias' &&
    displayParts[2].kind === DisplayPartKind.punctuation &&
    displayParts[2].text === ')'
  ) {
    i = 3
  } else if (
    displayParts[0].kind === DisplayPartKind.punctuation &&
    displayParts[0].text === '(' &&
    displayParts[1].kind === DisplayPartKind.text &&
    displayParts[1].text === 'property' &&
    displayParts[2].kind === DisplayPartKind.punctuation &&
    displayParts[2].text === ')'
  ) {
    i = 3
  }
  outer: for (; i < displayParts.length; ++i) {
    const part = displayParts[i]
    switch (part.kind as DisplayPartKind) {
      case DisplayPartKind.methodName:
      case DisplayPartKind.functionName:
      case DisplayPartKind.text:
      case DisplayPartKind.propertyName:
      case DisplayPartKind.localName:
      case DisplayPartKind.aliasName:
        if (parenCount === 0 && braceCount === 0) {
          isInMethod = true
        }
        if (
          part.kind === DisplayPartKind.localName ||
          part.kind === DisplayPartKind.aliasName ||
          part.kind === DisplayPartKind.propertyName
        ) {
          isLocalVariable = true
        }
        // if (part.kind === DisplayPartKind.aliasName) {
        //   firstParenthesisIndex = -1
        // }
        break
      case DisplayPartKind.parameterName:
        if (parenCount === 1 && braceCount === 0 && isInMethod) {
          // Only take top level paren names
          const next = displayParts[i + 1]
          // Skip optional parameters
          const nameIsFollowedByOptionalIndicator = next && next.text === '?'
          if (!nameIsFollowedByOptionalIndicator) {
            parts.push(part)
          }
          hasOptionalParameters =
            hasOptionalParameters || nameIsFollowedByOptionalIndicator
        }
        break

      case DisplayPartKind.punctuation:
        if (part.text === '(') {
          if (firstParenthesisIndex === -1) {
            firstParenthesisIndex = i
            if (
              firstBraceIndex !== -1 &&
              firstBraceIndex < firstParenthesisIndex
            ) {
              return NULL_FUNCTION_CALL_LIST_PART
            }
          }
          hasSeenParenthesis = true
          ++parenCount
        } else if (part.text === ')') {
          --parenCount
          if (parenCount <= 0 && isInMethod) {
            break outer
          }
        } else if (part.text === '...' && parenCount === 1) {
          // Found rest parameter. Do not fill in any further arguments
          hasOptionalParameters = true
          break outer
        } else if (part.text === '{') {
          if (firstBraceIndex === -1) {
            firstBraceIndex = i
          }
          ++braceCount
        } else if (part.text === '}') {
          --braceCount
        }
        break
    }
  }
  if (isLocalVariable && !hasSeenParenthesis) {
    return NULL_FUNCTION_CALL_LIST_PART
  }
  const result: ReturnType<typeof getParameterListParts> = {
    hasOptionalParameters,
    parts,
    isFunctionCall: true,
  }
  return result
}

connectionProxy.onCompletionResolve = (completionItem) => {
  const typescriptLanguageService = getLanguageService('')
  const details = typescriptLanguageService.getCompletionEntryDetails(
    completionItem.data.fsPath,
    completionItem.data.offset,
    completionItem.data.name,
    {
      semicolons: ts.SemicolonPreference.Remove,
    },
    completionItem.data.source,
    {
      quotePreference: 'single',
    }
  )
  if (!details) {
    return completionItem
  }
  completionItem.detail = ts.displayPartsToString(details.displayParts)
  if (details.source) {
    const importPath = ts.displayPartsToString(details.source)
    const autoImportLabel = `Auto import from ${importPath}`
    completionItem.detail = `${autoImportLabel}\n${completionItem.detail}`
  }
  if (details.codeActions && details.codeActions.length) {
    const document = documentsProxy.getDocument(
      `file://${completionItem.data.fsPath}`
    )
    const additionalTextEdits: TextEdit[] = []
    for (const tsAction of details.codeActions) {
      for (const change of tsAction.changes) {
        for (const textChange of change.textChanges) {
          const textEdit: TextEdit = {
            newText: textChange.newText,
            range: {
              start: document.positionAt(textChange.span.start),
              end: document.positionAt(
                textChange.span.start + textChange.span.length
              ),
            },
          }
          additionalTextEdits.push(textEdit)
        }
      }
    }
    completionItem.additionalTextEdits = additionalTextEdits
  }

  if (completionItem.data.maybeCompleteFunctionCall) {
    // const text = documentsProxy
    //   .getDocument(`file://${completionItem.data.fsPath}`)
    //   .getText()
    // const after = virtualFileSystemUtils.getLineTextAfter(
    //   text,
    //   completionItem.data.offset
    // )
    // const hasAlreadyFunctionCall = after.match(/^[a-z_$0-9]*\s*\(/gi)
    // if (hasAlreadyFunctionCall) {
    // return
    // }
    const listParts = getParameterListParts(details.displayParts)
    if (!listParts.isFunctionCall) {
      return completionItem
    }
    // const util = require('util')
    // console.log(util.inspect(details, { depth: 10 }))
    // console.log(util.inspect(listParts, { depth: 10 }))
    let parameters = listParts.parts
      .map((part, index) => `\${${index + 1}:${part.text}}`)
      .join(', ')
    if (listParts.hasOptionalParameters) {
      parameters += '${0}'
    }
    let parameterCount = listParts.parts.length
    if (listParts.hasOptionalParameters) {
      parameterCount++
    }
    if (parameterCount > 0) {
      completionItem.command = {
        title: 'triggerParameterHints',
        command: 'editor.action.triggerParameterHints',
      }
    }

    /**
     * Usually it is not allowed to manipulate the insertText inside `completionResolve` because `completionResolve` is not always called (e.g. if the user accepts the completion before `completionResolve` has finished). However it is significantly faster this way and the only downside is that if the user is typing fast, then the insertText for `console` will only be `log` instead of `log()`
     */
    completionItem.insertText = `${
      completionItem.insertText || completionItem.label
    }(${parameters})`
    completionItem.insertTextFormat = InsertTextFormat.Snippet
  }

  return completionItem
}

connectionProxy.listen()
