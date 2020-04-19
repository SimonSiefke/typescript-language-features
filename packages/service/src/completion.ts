import {
  CompletionItemKind,
  CompletionList,
  Position,
} from 'vscode-languageserver'
import type { LanguageService } from 'typescript'

export const onCompletion = ({
  typescript,
  offsetAt,
}: {
  typescript: typeof import('typescript/lib/typescript')
  offsetAt: (fsPath: string, position: Position) => number
}) => {
  const getCompletionItemKind: (
    kind: import('typescript').ScriptElementKind
  ) => CompletionItemKind = (kind) => {
    switch (kind) {
      case typescript.ScriptElementKind.primitiveType:
      case typescript.ScriptElementKind.keyword:
        return CompletionItemKind.Keyword
      case typescript.ScriptElementKind.constElement:
        return CompletionItemKind.Constant
      case typescript.ScriptElementKind.letElement:
      case typescript.ScriptElementKind.variableElement:
      case typescript.ScriptElementKind.localVariableElement:
      case typescript.ScriptElementKind.alias:
        return CompletionItemKind.Variable
      case typescript.ScriptElementKind.memberVariableElement:
      case typescript.ScriptElementKind.memberGetAccessorElement:
      case typescript.ScriptElementKind.memberSetAccessorElement:
        return CompletionItemKind.Field
      case typescript.ScriptElementKind.functionElement:
      case typescript.ScriptElementKind.localFunctionElement:
        return CompletionItemKind.Function
      case typescript.ScriptElementKind.memberFunctionElement:
      case typescript.ScriptElementKind.constructSignatureElement:
      case typescript.ScriptElementKind.callSignatureElement:
      case typescript.ScriptElementKind.indexSignatureElement:
        return CompletionItemKind.Method
      case typescript.ScriptElementKind.enumElement:
        return CompletionItemKind.Enum
      case typescript.ScriptElementKind.moduleElement:
      case typescript.ScriptElementKind.externalModuleName:
        return CompletionItemKind.Module
      case typescript.ScriptElementKind.classElement:
      case typescript.ScriptElementKind.typeElement:
        return CompletionItemKind.Class
      case typescript.ScriptElementKind.interfaceElement:
        return CompletionItemKind.Interface
      case typescript.ScriptElementKind.warning:
      case typescript.ScriptElementKind.scriptElement:
        return CompletionItemKind.File
      case typescript.ScriptElementKind.directory:
        return CompletionItemKind.Folder
      case typescript.ScriptElementKind.string:
        return CompletionItemKind.Constant
      default:
        return CompletionItemKind.Property
    }
  }
  const getCommitCharacters: (
    tsEntry: import('typescript').CompletionEntry
  ) => string[] | undefined = (tsEntry) => {
    const commitCharacters: string[] = []
    switch (tsEntry.kind) {
      case typescript.ScriptElementKind.memberGetAccessorElement:
      case typescript.ScriptElementKind.memberSetAccessorElement:
      case typescript.ScriptElementKind.constructSignatureElement:
      case typescript.ScriptElementKind.callSignatureElement:
      case typescript.ScriptElementKind.indexSignatureElement:
      case typescript.ScriptElementKind.enumElement:
      case typescript.ScriptElementKind.interfaceElement:
        commitCharacters.push('.', ';')
        break
      case typescript.ScriptElementKind.moduleElement:
      case typescript.ScriptElementKind.alias:
      case typescript.ScriptElementKind.constElement:
      case typescript.ScriptElementKind.letElement:
      case typescript.ScriptElementKind.variableElement:
      case typescript.ScriptElementKind.localVariableElement:
      case typescript.ScriptElementKind.memberVariableElement:
      case typescript.ScriptElementKind.classElement:
      case typescript.ScriptElementKind.functionElement:
      case typescript.ScriptElementKind.memberFunctionElement:
      case typescript.ScriptElementKind.keyword:
      case typescript.ScriptElementKind.parameterElement:
        commitCharacters.push('.', ',', ';')
        break
    }
    return commitCharacters.length === 0 ? undefined : commitCharacters
  }
  const toCompletionList: (
    completions: import('typescript').WithMetadata<
      import('typescript').CompletionInfo
    >,
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
  return (
    languageService: LanguageService,
    fsPath: string,
    position: Position
  ) => {
    const offset = offsetAt(fsPath, position)
    const completions = languageService.getCompletionsAtPosition(
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
}
