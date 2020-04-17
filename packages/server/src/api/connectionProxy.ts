import {
  CancellationToken,
  CodeAction,
  CodeLens,
  ColorInformation,
  ColorPresentation,
  CompletionItem,
  CompletionList,
  Connection,
  createConnection,
  DeclarationLink,
  Definition,
  DefinitionLink,
  DidChangeWatchedFilesParams,
  DocumentHighlight,
  DocumentLink,
  DocumentSymbol,
  Hover,
  InitializedParams,
  InitializeParams,
  InitializeResult,
  Location,
  Range,
  RenameParams,
  RequestHandler,
  RequestType,
  SelectionRange,
  SelectionRangeParams,
  SignatureHelp,
  SymbolInformation,
  TextDocumentPositionParams,
  TextEdit,
  WorkDoneProgressParams,
  WorkspaceEdit,
} from 'vscode-languageserver'
import {
  CodeActionParams,
  CodeLensParams,
  ColorPresentationParams,
  CompletionParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DocumentColorParams,
  DocumentFormattingParams,
  DocumentLinkParams,
  DocumentOnTypeFormattingParams,
  DocumentRangeFormattingParams,
  DocumentSymbolParams,
  FoldingRange,
  FoldingRangeParams,
  PrepareRenameParams,
  ReferenceParams,
  WorkspaceSymbolParams,
} from 'vscode-languageserver-protocol'
import { runSafeAsync } from './runSafe'

type Thenable<T> = T | Promise<T>

type Disposable = {
  readonly dispose: () => void
}

/**
 * The parameters of a [ExecuteCommandRequest](#ExecuteCommandRequest).
 */
export interface ExecuteCommandParams<T = any[]>
  extends WorkDoneProgressParams {
  /**
   * The identifier of the actual command handler.
   */
  command: string
  /**
   * Arguments that the command should be invoked with.
   */
  arguments?: T
}

export interface ConnectionProxy {
  readonly connection: Connection
  readonly listen: Connection['listen']

  readonly onRequest: Connection['onRequest']

  onDidChangeWatchedFiles: (
    listener: (params: DidChangeWatchedFilesParams) => void
  ) => Disposable
  // readonly onDidChangeWatchedFiles: Connection['onDidChangeWatchedFiles']
  onCodeAction: (params: CodeActionParams) => CodeAction[]
  onCodeLens: (params: CodeLensParams) => CodeLens[]
  onCodeLensResolve: (codeLens: CodeLens) => CodeLens
  onColorPresentation: (params: ColorPresentationParams) => ColorPresentation[]
  onCompletion: (params: CompletionParams) => CompletionList | undefined
  onCompletionResolve: (completionItem: CompletionItem) => CompletionItem
  onDeclaration: (params: TextDocumentPositionParams) => DeclarationLink[]
  onDefinition: (
    params: TextDocumentPositionParams
  ) => DefinitionLink[] | Location | undefined
  onDocumentColor: (params: DocumentColorParams) => Thenable<ColorInformation[]>
  onDidChangeTextDocument: (params: DidChangeTextDocumentParams) => void
  onDidOpenTextDocument: (params: DidOpenTextDocumentParams) => void
  onDidCloseTextDocument: (params: DidCloseTextDocumentParams) => void
  onDocumentFormatting: (params: DocumentFormattingParams) => TextEdit[]
  onDocumentHighlight: (
    params: TextDocumentPositionParams
  ) => DocumentHighlight[]
  onDocumentLinkResolve: (documentLink: DocumentLink) => DocumentLink
  onDocumentLinks: (params: DocumentLinkParams) => DocumentLink[]
  onDocumentOnTypeFormatting: (
    params: DocumentOnTypeFormattingParams
  ) => TextEdit[]
  onFoldingRanges: (params: FoldingRangeParams) => FoldingRange[]
  onDocumentRangeFormatting: (
    params: DocumentRangeFormattingParams
  ) => TextEdit[]
  onExecuteCommand: <Params, Result>(
    executeCommandParams: ExecuteCommandParams<Params>
  ) => Result
  readonly registerCommand: <Params = any, Result = any>(
    command: string,
    executeCommand: (params: Params) => Result
  ) => void
  onDocumentSymbol: (
    params: DocumentSymbolParams
  ) => DocumentSymbol[] | SymbolInformation[]
  onHover: (params: TextDocumentPositionParams) => Hover | undefined
  onImplementation: (
    params: TextDocumentPositionParams
  ) => Definition | undefined
  onInitialize: (
    params: InitializeParams,
    token: CancellationToken
  ) => Thenable<InitializeResult>
  onInitialized: (params: InitializedParams) => void
  onPrepareRename: (params: PrepareRenameParams) => Range | undefined
  onReferences: (params: ReferenceParams) => Location[]
  onRenameRequest: (params: RenameParams) => WorkspaceEdit | undefined
  onSignatureHelp: (
    params: TextDocumentPositionParams
  ) => SignatureHelp | undefined
  onTypeDefinition: (
    params: TextDocumentPositionParams
  ) => Definition | undefined
  onWorkspaceSymbol: (params: WorkspaceSymbolParams) => SymbolInformation[]
  onSelectionRanges: (params: SelectionRangeParams) => SelectionRange[]
  sendDiagnostics: Connection['sendDiagnostics']
}

const connection = createConnection()

export const connectionProxy: ConnectionProxy = {
  connection,
  listen: connection.listen.bind(connection),
  sendDiagnostics: connection.sendDiagnostics.bind(connection),
  // @ts-ignore TODO
  onRequest: (
    type: RequestType<any, any, any, any>,
    handler: RequestHandler<any, any, any>
  ) => connection.onRequest(type, runSafeAsync(handler, 'onRequest')),
  // onDidChangeWatchedFiles: ()
  set onSelectionRanges(handler: ConnectionProxy['onSelectionRanges']) {
    connection.onSelectionRanges(runSafeAsync(handler, 'onSelectionRanges'))
  },
  set onCodeAction(handler: ConnectionProxy['onCodeAction']) {
    connection.onCodeAction(runSafeAsync(handler, 'onCodeAction'))
  },
  set onDidOpenTextDocument(handler: ConnectionProxy['onDidOpenTextDocument']) {
    connection.onDidOpenTextDocument(
      runSafeAsync(handler, 'onDidOpenTextDocument')
    )
  },
  set onDidCloseTextDocument(
    handler: ConnectionProxy['onDidCloseTextDocument']
  ) {
    connection.onDidCloseTextDocument(
      runSafeAsync(handler, 'onDidCloseTextdocument')
    )
  },
  set onDidChangeTextDocument(
    handler: ConnectionProxy['onDidChangeTextDocument']
  ) {
    connection.onDidChangeTextDocument(
      runSafeAsync(handler, 'onDidChangeTextDocument')
    )
  },
  set onCodeLens(handler: ConnectionProxy['onCodeLens']) {
    connection.onCodeLens(runSafeAsync(handler, 'onCodeLens'))
  },
  set onCodeLensResolve(handler: ConnectionProxy['onCodeLensResolve']) {
    connection.onCodeLensResolve(runSafeAsync(handler, 'onCodeLensResolve'))
  },
  set onColorPresentation(handler: ConnectionProxy['onColorPresentation']) {
    connection.onColorPresentation(runSafeAsync(handler, 'onColorPresentation'))
  },
  set onCompletion(handler: ConnectionProxy['onCompletion']) {
    connection.onCompletion(runSafeAsync(handler, 'onCompletion'))
  },
  set onCompletionResolve(handler: ConnectionProxy['onCompletionResolve']) {
    connection.onCompletionResolve(runSafeAsync(handler, 'onCompletionResolve'))
  },
  set onDeclaration(handler: ConnectionProxy['onDeclaration']) {
    connection.onDeclaration(runSafeAsync(handler, 'onDeclaration'))
  },
  set onDefinition(handler: ConnectionProxy['onDefinition']) {
    connection.onDefinition(runSafeAsync(handler, 'onDefinition'))
  },
  set onDocumentColor(handler: ConnectionProxy['onDocumentColor']) {
    connection.onDocumentColor(runSafeAsync(handler, 'onDocumentColor'))
  },
  set onDocumentFormatting(handler: ConnectionProxy['onDocumentFormatting']) {
    connection.onDocumentFormatting(
      runSafeAsync(handler, 'onDocumentFormatting')
    )
  },
  set onDocumentHighlight(handler: ConnectionProxy['onDocumentHighlight']) {
    connection.onDocumentHighlight(runSafeAsync(handler, 'onDocumentHighlight'))
  },
  set onDocumentLinkResolve(handler: ConnectionProxy['onDocumentLinkResolve']) {
    connection.onDocumentLinkResolve(
      runSafeAsync(handler, 'onDocumentLinkResolve')
    )
  },
  set onDocumentLinks(handler: ConnectionProxy['onDocumentLinks']) {
    connection.onDocumentLinks(runSafeAsync(handler, 'onDocumentLinks'))
  },
  set onDocumentOnTypeFormatting(
    handler: ConnectionProxy['onDocumentOnTypeFormatting']
  ) {
    connection.onDocumentOnTypeFormatting(
      runSafeAsync(handler, 'onDocumentOnTypeFormatting')
    )
  },
  set onFoldingRanges(handler: ConnectionProxy['onFoldingRanges']) {
    connection.onFoldingRanges(runSafeAsync(handler, 'onFoldingRanges'))
  },
  set onDocumentRangeFormatting(
    handler: ConnectionProxy['onDocumentRangeFormatting']
  ) {
    connection.onDocumentRangeFormatting(
      runSafeAsync(handler, 'onDocumentRangeFormatting')
    )
  },
  set onDocumentSymbol(handler: ConnectionProxy['onDocumentSymbol']) {
    connection.onDocumentSymbol(runSafeAsync(handler, 'onDocumentSymbol'))
  },
  set onHover(handler: ConnectionProxy['onHover']) {
    connection.onHover(runSafeAsync(handler, 'onHover'))
  },
  set onImplementation(handler: ConnectionProxy['onImplementation']) {
    connection.onImplementation(runSafeAsync(handler, 'onImplementation'))
  },
  set onInitialize(handler: ConnectionProxy['onInitialize']) {
    connection.onInitialize(runSafeAsync(handler, 'onInitialize'))
  },
  set onInitialized(handler: ConnectionProxy['onInitialized']) {
    connection.onInitialized(runSafeAsync(handler, 'onInitialized'))
  },
  set onPrepareRename(handler: ConnectionProxy['onPrepareRename']) {
    connection.onPrepareRename(runSafeAsync(handler, 'onPrepareRename'))
  },
  set onReferences(handler: ConnectionProxy['onReferences']) {
    connection.onReferences(runSafeAsync(handler, 'onReferences'))
  },
  set onRenameRequest(handler: ConnectionProxy['onRenameRequest']) {
    connection.onRenameRequest(runSafeAsync(handler, 'onRenameRequest'))
  },
  set onSignatureHelp(handler: ConnectionProxy['onSignatureHelp']) {
    connection.onSignatureHelp(runSafeAsync(handler, 'onSignatureHelp'))
  },
  set onTypeDefinition(handler: ConnectionProxy['onTypeDefinition']) {
    connection.onTypeDefinition(runSafeAsync(handler, 'onTypeDefinition'))
  },
  set onWorkspaceSymbol(handler: ConnectionProxy['onWorkspaceSymbol']) {
    connection.onWorkspaceSymbol(runSafeAsync(handler, 'onWorkspaceSymbol'))
  },
}
