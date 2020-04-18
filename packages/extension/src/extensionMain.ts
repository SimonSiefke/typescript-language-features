import * as path from 'path'
import * as vscode from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient'

const getIntellicodePath: () => string | undefined = () => {
  const intelliCodeExtension = vscode.extensions.getExtension(
    'visualstudioexptteam.vscodeintellicode'
  )
  if (!intelliCodeExtension) {
    return undefined
  }
  return intelliCodeExtension.extensionPath
}

const CLIENT_OPTIONS: LanguageClientOptions = {
  documentSelector: [
    {
      scheme: '*',
      language: 'javascript',
    },
    {
      scheme: '*',
      language: 'javascriptreact',
    },
    {
      scheme: '*',
      language: 'typescript',
    },
    {
      scheme: '*',
      language: 'typescriptreact',
    },
  ],
  progressOnInitialization: true,
  outputChannel: vscode.window.createOutputChannel(
    'TypeScript Language Features'
  ),
  initializationOptions: {
    intellicodePath: getIntellicodePath(),
  },
  // middleware: {
  //   provideCompletionItem: async (document, position, context, token, next) => {
  //     const start = new Date().getTime()
  //     const result = await next(document, position, context, token)
  //     const end = new Date().getTime()
  //     console.log('took' + (end - start))
  //     return result
  //   },
  // },
}

const SERVER_OPTIONS: ServerOptions = {
  module: path.join(__dirname, '../../server/dist/serverMain.js'),
  transport: TransportKind.ipc,
}

const languageClient = new LanguageClient(
  'typescript-language-features',
  'TypeScript Language Features',
  SERVER_OPTIONS,
  CLIENT_OPTIONS
)

export const activate = async (context: vscode.ExtensionContext) => {
  context.subscriptions.push(languageClient.start())
  await languageClient.onReady()
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  ) {
    import('./autoreload')
  }
}
