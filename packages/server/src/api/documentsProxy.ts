import {
  TextDocumentContentChangeEvent,
  VersionedTextDocumentIdentifier,
  TextDocumentIdentifier,
} from 'vscode-languageserver'
import { TextDocument as _TextDocument } from 'vscode-languageserver-textdocument'
import { connectionProxy } from './connectionProxy'

interface TextDocument {
  readonly text: string
  readonly version: number
}

const cachedTextDocuments: { [key: string]: TextDocument } = Object.create(null)

const cachedChangeListeners: ((
  textDocument: TextDocumentIdentifier,
  oldText: string,
  oldDocument: _TextDocument,
  newText: string,
  newDocument: _TextDocument,
  contentChanges: readonly TextDocumentContentChangeEvent[]
) => void)[] = []

const cachedCloseListeners: ((uri: string) => void)[] = []

connectionProxy.onDidOpenTextDocument = ({ textDocument }) => {
  cachedTextDocuments[textDocument.uri] = {
    text: textDocument.text,
    version: textDocument.version,
  }
}

connectionProxy.onDidCloseTextDocument = ({ textDocument: { uri } }) => {
  delete cachedTextDocuments[uri]
  for (const listener of cachedCloseListeners) {
    listener(uri)
  }
}

connectionProxy.onDidChangeTextDocument = ({
  textDocument,
  contentChanges,
}) => {
  const oldDocument = _TextDocument.create(
    textDocument.uri,
    textDocument.uri.endsWith('.vue') ? 'vue' : 'typescript',
    0,
    cachedTextDocuments[textDocument.uri].text
  )
  const newDocument = _TextDocument.update(oldDocument, contentChanges, 0)
  const oldText = cachedTextDocuments[textDocument.uri].text
  const newText = newDocument.getText()
  cachedTextDocuments[textDocument.uri] = {
    version: textDocument.version as number,
    text: newText,
  }
  for (const listener of cachedChangeListeners) {
    listener(
      textDocument,
      oldText,
      oldDocument,
      newText,
      newDocument,
      contentChanges
    )
  }
}

export interface DocumentsProxy {
  readonly onDidChangeTextDocument: (
    listener: (
      textDocument: VersionedTextDocumentIdentifier,
      oldText: string,
      oldDocument: _TextDocument,
      newText: string,
      newDocument: _TextDocument,
      contentChanges: readonly TextDocumentContentChangeEvent[]
    ) => void
  ) => void
  readonly onDidCloseTextDocument: (listener: (uri: string) => void) => void
  readonly getDocument: (uri: string) => _TextDocument
  readonly hasDocument: (uri: string) => boolean
}

export const documentsProxy: DocumentsProxy = {
  onDidChangeTextDocument: (listener) => cachedChangeListeners.push(listener),
  onDidCloseTextDocument: (listener) => cachedCloseListeners.push(listener),
  getDocument: (uri) =>
    _TextDocument.create(
      uri,
      uri.endsWith('vue') ? 'vue' : 'typescript',
      cachedTextDocuments[uri].version,
      cachedTextDocuments[uri].text
    ),
  hasDocument: (uri: string) => {
    return uri in cachedTextDocuments
  },
}
