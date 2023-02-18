import { LanguageService } from 'typescript'
import {
  CompletionItem,
  InsertTextFormat,
  Position,
  TextEdit,
} from 'vscode-languageserver'

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
  displayParts: import('typescript').SymbolDisplayPart[]
) => {
  parts: import('typescript').SymbolDisplayPart[]
  hasOptionalParameters: boolean
  isFunctionCall: boolean
} = (displayParts) => {
  const parts: import('typescript').SymbolDisplayPart[] = []
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

export const onCompletionResolve =
  ({
    typescript,
    positionAt,
    offsetAt,
  }: {
    typescript: typeof import('typescript/lib/typescript')
    positionAt: (fsPath: string, offset: number) => Position
    offsetAt: (fsPath: string, position: Position) => number
  }) =>
  (languageService: LanguageService, completionItem: CompletionItem) => {
    const details = languageService.getCompletionEntryDetails(
      completionItem.data.fsPath,
      completionItem.data.offset,
      completionItem.data.name,
      {
        semicolons: typescript.SemicolonPreference.Remove,
      },
      completionItem.data.source,
      {
        quotePreference: 'single',
      },
      undefined
    )
    if (!details) {
      return completionItem
    }
    completionItem.detail = typescript.displayPartsToString(
      details.displayParts
    )
    if (details.source) {
      const importPath = typescript.displayPartsToString(details.source)
      const autoImportLabel = `Auto import from ${importPath}`
      completionItem.detail = `${autoImportLabel}\n${completionItem.detail}`
    }
    if (details.codeActions && details.codeActions.length) {
      const additionalTextEdits: TextEdit[] = []
      for (const tsAction of details.codeActions) {
        for (const change of tsAction.changes) {
          for (const textChange of change.textChanges) {
            const textEdit: TextEdit = {
              newText: textChange.newText,
              range: {
                start: positionAt(
                  completionItem.data.fsPath,
                  textChange.span.start
                ),
                end: positionAt(
                  completionItem.data.fsPath,
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
