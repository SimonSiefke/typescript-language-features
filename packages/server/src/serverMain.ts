import * as fs from 'fs'
import * as path from 'path'
import {
  CompletionItemKind,
  CompletionList,
  InitializeResult,
  InsertTextFormat,
  TextDocumentSyncKind,
  TextEdit,
  Position,
} from 'vscode-languageserver'
import { connectionProxy } from './api/connectionProxy'
import { documentsProxy } from './api/documentsProxy'
import {
  onCompletion,
  onCompletionResolve,
  createTypescriptLanguageService,
} from 'service'
import { LanguageService } from 'typescript/lib/tsserverlibrary'

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

connectionProxy.onInitialize = ({ initializationOptions }) => {
  const intellicodePath = initializationOptions.intellicodePath as
    | string
    | undefined
  const typescriptPath = initializationOptions.typescriptPath as
    | string
    | undefined

  const typescript = eval('require')(
    typescriptPath
  ) as typeof import('typescript/lib/tsserverlibrary')
  const positionAt = (fsPath: string, offset: number) => {
    return documentsProxy.getDocument(`file://${fsPath}`).positionAt(offset)
  }
  const offsetAt = (fsPath: string, position: Position) => {
    return documentsProxy.getDocument(`file://${fsPath}`).offsetAt(position)
  }
  const typescriptMode = {
    onCompletion: onCompletion({
      typescript,
      offsetAt,
    }),
    onCompletionResolve: onCompletionResolve({
      typescript,
      offsetAt,
      positionAt,
    }),
  }
  const getLanguageService = (() => {
    let languageService: LanguageService
    return (fsPath: string) => {
      if (!languageService) {
        languageService = createTypescriptLanguageService(
          fsPath,
          typescript,
          intellicodePath,
          (path) => documentsProxy.hasDocument(`file://${path}`),
          (path) => documentsProxy.getDocument(`file://${path}`).version + '',
          (path) => documentsProxy.getDocument(`file://${path}`).getText()
        )
      }
      return languageService
    }
  })()
  connectionProxy.onCompletion = ({ textDocument, position }) => {
    const fsPath = textDocument.uri.slice(7)
    const languageService = getLanguageService(fsPath)
    return typescriptMode.onCompletion(languageService, fsPath, position)
  }
  connectionProxy.onCompletionResolve = (completionItem) => {
    const languageService = getLanguageService(completionItem.data.fsPath)
    return typescriptMode.onCompletionResolve(languageService, completionItem)
  }
  return initializeResult
}

connectionProxy.listen()
