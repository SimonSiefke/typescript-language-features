import { ConnectionProxy } from './connectionProxy'
import { DocumentsProxy } from './documentsProxy'

export interface Api {
  readonly connectionProxy: ConnectionProxy
  readonly documentsProxy: DocumentsProxy
}
