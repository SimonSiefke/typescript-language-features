import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as assert from 'assert'

// console.log(process.env.extensionPath);

assert.ok(process.env.extensionPath)

const packageJSON = JSON.parse(
  fs.readFileSync(
    path.join(process.env.extensionPath as string, 'package.json'),
    'utf-8'
  )
) as { name: string; publisher: string }

// console.log(JSON.stringify(packageJSON));

assert.ok(packageJSON.publisher)
assert.ok(packageJSON.name)

const extension = vscode.extensions.getExtension(
  `${packageJSON.publisher}.${packageJSON.name}`
) as vscode.Extension<any>
// const extension = vscode.extensions.getExtension(
//   `SimonSiefke.vue-language-features`
// ) as vscode.Extension<any>;

assert.ok(extension)

export const activateExtension = () => extension.activate()

interface Diagnostic {
  offset?: number
  length?: number
  message?: string | RegExp
}

export interface TestCase {
  input?: string
  literalInput?: string
  offset?: number
  type?: string
  expect?: string
  /**
   * Expect the content of other files to equal a given string.
   * It is recommended to also use `expectOtherFilesWaitForEdits`
   * to wait for edits (e.g. import renames) to be applied
   */
  expectOtherFiles?: { [key: string]: string | undefined }
  expectOtherFilesWaitForEdits?: number
  only?: boolean
  speed?: number
  skip?: boolean
  timeout?: 'never' | number
  debug?: boolean
  selection?: [number, number]
  afterTypeCommands?: string[]
  undoStops?: boolean
  waitForDiagnostics?: boolean
  expectDiagnostics?: Diagnostic[]
  applyCodeAction?: string
  renameFiles?: { [key: string]: string }
  breakAfter?: 'renameFiles'
  expectCursorOffset?: number
}

export async function createTestFile(
  fileName: string,
  content: string = ''
): Promise<void> {
  const filePath = path.join(
    vscode.workspace.workspaceFolders![0].uri.fsPath,
    fileName
  )
  fs.ensureDirSync(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
  const uri = vscode.Uri.file(filePath)
  await vscode.window.showTextDocument(uri)
  await vscode.workspace.saveAll()
}

export async function createTestFileInBackground(
  fileName: string,
  content: string = ''
): Promise<void> {
  const filePath = path.join(
    vscode.workspace.workspaceFolders![0].uri.fsPath,
    fileName
  )
  fs.ensureDirSync(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
  const previousUri = vscode.window.activeTextEditor!.document.uri
  const uri = vscode.Uri.file(filePath)
  await vscode.window.showTextDocument(uri)
  await vscode.workspace.saveAll()
  await vscode.window.showTextDocument(previousUri)
}

export async function removeTestFile(): Promise<void> {
  const uri = vscode.window.activeTextEditor?.document.uri as vscode.Uri
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
  await vscode.workspace.fs.delete(uri)
}

export async function setText(text: string): Promise<void> {
  const document = vscode.window.activeTextEditor!.document
  const all = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  )
  await vscode.window.activeTextEditor!.edit((editBuilder) =>
    editBuilder.replace(all, text)
  )
}

function setCursorPositions(offsets: number[]): void {
  const positions = offsets.map((offset) =>
    vscode.window.activeTextEditor!.document.positionAt(offset)
  )
  const selections = positions.map(
    (position) => new vscode.Selection(position, position)
  )
  vscode.window.activeTextEditor!.selections = selections
}

async function typeLiteral(text: string, undoStops = false): Promise<void> {
  await vscode.window.activeTextEditor!.insertSnippet(
    new vscode.SnippetString(text),
    vscode.window.activeTextEditor!.selections,
    {
      undoStopAfter: undoStops,
      undoStopBefore: undoStops,
    }
  )
}

async function typeDelete(times: number = 1): Promise<void> {
  const offsets = vscode.window.activeTextEditor!.selections.map((selection) =>
    vscode.window.activeTextEditor!.document.offsetAt(selection.active)
  )
  await new Promise(async (resolve) => {
    await vscode.window.activeTextEditor!.edit((editBuilder) => {
      for (const offset of offsets) {
        editBuilder.delete(
          new vscode.Range(
            vscode.window.activeTextEditor!.document.positionAt(offset - times),
            vscode.window.activeTextEditor!.document.positionAt(offset)
          )
        )
      }
    })
    resolve(undefined)
  })
}
async function type(
  text: string,
  speed = 150,
  undoStops = false
): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    if (i === 0) {
      await new Promise((resolve) => setTimeout(resolve, speed / 2))
    } else {
      await new Promise((resolve) => setTimeout(resolve, speed))
    }
    if (text.slice(i).startsWith('{backspace}')) {
      await typeDelete()
      i += '{backspace}'.length - 1
    } else if (text.slice(i).startsWith('{undo}')) {
      await vscode.commands.executeCommand('undo')
      i += '{undo}'.length - 1
    } else if (text.slice(i).startsWith('{redo}')) {
      await vscode.commands.executeCommand('redo')
      i += '{redo}'.length - 1
    } else if (text.slice(i).startsWith('{tab}')) {
      await vscode.commands.executeCommand('html-expand-abbreviation')
      i += '{tab}'.length - 1
    } else if (text.slice(i).startsWith('{end}')) {
      await vscode.commands.executeCommand('cursorEnd')
      i += '{end}'.length - 1
    } else if (text.slice(i).startsWith('{down}')) {
      await vscode.commands.executeCommand('cursorDown')
      i += '{down}'.length - 1
    } else if (text.slice(i).startsWith('{copyLineDown}')) {
      await vscode.commands.executeCommand('editor!.action.copyLinesDownAction')
      i += '{copyLineDown}'.length - 1
    } else {
      await typeLiteral(text[i], undoStops)
    }
  }
}

async function waitForEdits(timeout: 'never' | number) {
  return new Promise((resolve) => {
    const disposable = vscode.workspace.onDidChangeTextDocument(() => {
      disposable.dispose()
      resolve(undefined)
    })
    if (timeout !== 'never') {
      setTimeout(resolve, timeout)
    }
  })
}

export function getText(): string {
  return vscode.window.activeTextEditor!.document.getText()
}

export async function run(
  testCases: readonly TestCase[],
  { speed = 0, timeout = 40, afterCommands = [] as any[] } = {}
) {
  // await setText('')
  const only = testCases.filter((testCase) => testCase.only)
  const applicableTestCases = only.length ? only : testCases
  for (const testCase of applicableTestCases) {
    if (testCase.skip) {
      continue
    }
    if (testCase.literalInput !== undefined) {
      await setText(testCase.literalInput)
    }
    if (testCase.offset !== undefined) {
      setCursorPositions([testCase.offset])
    }
    if (testCase.input !== undefined) {
      const cursorOffsets = []
      for (let i = 0; i < testCase.input.length; i++) {
        if (testCase.input[i] === '|') {
          cursorOffsets.push(i - cursorOffsets.length)
        }
      }
      const input = testCase.input.replace(/\|/g, '')
      await setText(input)
      if (cursorOffsets.length > 0) {
        setCursorPositions(cursorOffsets)
      }
    }
    if (testCase.selection) {
      const [start, end] = testCase.selection
      vscode.window.activeTextEditor!.selection = new vscode.Selection(
        vscode.window.activeTextEditor!.document.positionAt(start),
        vscode.window.activeTextEditor!.document.positionAt(end)
      )
    }
    if (testCase.type) {
      await type(
        testCase.type,
        testCase.speed || speed,
        testCase.undoStops || false
      )
      const autoCompleteTimeout = testCase.timeout || timeout
      await waitForEdits(autoCompleteTimeout)
    }

    if (testCase.waitForDiagnostics) {
      let passedTime = 0
      const maxPassedTime = 20000
      const pollingInterval = 30
      let success = false
      while (passedTime < maxPassedTime) {
        const diagnostics = vscode.languages.getDiagnostics(
          vscode.window.activeTextEditor!.document.uri
        )
        if (diagnostics.length > 0) {
          console.log('length' + diagnostics.length)
          // console.log(JSON.stringify(diagnostics))
          success = true
          break
        }
        await new Promise((resolve) => setTimeout(resolve, pollingInterval))
      }
      if (!success) {
        throw new Error('no diagnostics received')
      }
    }
    const resolvedAfterCommands = testCase.afterTypeCommands || afterCommands
    for (const afterCommand of resolvedAfterCommands) {
      if (afterCommand === 'acceptSelectedSuggestion') {
        await new Promise((r) => setTimeout(r, 15000))
      }
      await vscode.commands.executeCommand(afterCommand)
      if (afterCommand === 'editor.action.triggerSuggest') {
        await vscode.commands.executeCommand(
          'vscode.executeCompletionItemProvider',
          vscode.window.activeTextEditor?.document.uri,
          vscode.window.activeTextEditor?.selection.active
        )
      }

      const autoCompleteTimeout = testCase.timeout || timeout
      await waitForEdits(autoCompleteTimeout)
    }
    // await vscode.commands.executeCommand('type', { text: 'Hello' })
    if (testCase.debug) {
      await new Promise(() => {})
    }
    if (testCase.renameFiles) {
      const workspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit()
      for (const [oldFile, newFile] of Object.entries(testCase.renameFiles)) {
        const oldUri = vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, oldFile)
        )
        const newUri = vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, newFile)
        )
        workspaceEdit.renameFile(oldUri, newUri)
      }
      await vscode.workspace.applyEdit(workspaceEdit)
    }
    if (testCase.breakAfter === 'renameFiles') {
      await new Promise(() => {})
    }
    if (testCase.applyCodeAction) {
      await new Promise((r) => setTimeout(r, 1000))
      const codeActions: vscode.CodeAction[] =
        (await vscode.commands.executeCommand(
          'vscode.executeCodeActionProvider',
          vscode.window.activeTextEditor!.document.uri,
          vscode.window.activeTextEditor!.selection
        )) || []
      const found = codeActions.find(
        (codeAction) => codeAction.title === testCase.applyCodeAction
      )
      assert(found)
      if (found!.command) {
        await vscode.commands.executeCommand(
          found!.command.command,
          ...found!.command!.arguments!
        )
      }
    }
    outer: if (testCase.expect !== undefined) {
      if (getText() === testCase.expect.replace(/\|/g, '')) {
        break outer
      }
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 15))
        if (getText() === testCase.expect.replace(/\|/g, '')) {
          break outer
        }
      }
      assert.equal(getText(), testCase.expect.replace(/\|/g, ''))
    }
    if (testCase.expectCursorOffset !== undefined) {
      const offset = vscode.window.activeTextEditor!.document.offsetAt(
        vscode.window.activeTextEditor!.selection.active
      )
      assert.equal(offset, testCase.expectCursorOffset)
    }
    if (testCase.expectOtherFiles) {
      if (testCase.expectOtherFilesWaitForEdits) {
        await waitForEdits(testCase.expectOtherFilesWaitForEdits)
      }
      await vscode.workspace.saveAll()
      for (const [relativePath, expectedContent] of Object.entries(
        testCase.expectOtherFiles
      )) {
        const absolutePath = path.join(
          vscode.workspace.workspaceFolders![0].uri.fsPath,
          relativePath
        )
        const document = await vscode.workspace.openTextDocument(
          vscode.Uri.file(absolutePath)
        )
        const actualContent = document.getText()
        assert.equal(actualContent, expectedContent)
      }
    }

    if (testCase.expectDiagnostics) {
      let passedTime = 0
      const maxPassedTime = 3000
      const pollingInterval = 30
      let diagnostics: vscode.Diagnostic[] = []
      let success = false
      outer: while (passedTime < maxPassedTime) {
        diagnostics = vscode.languages.getDiagnostics(
          vscode.window.activeTextEditor!.document.uri
        )
        if (diagnostics.length === testCase.expectDiagnostics.length) {
          for (const expectedDiagnostic of testCase.expectDiagnostics) {
            let matches = diagnostics
            if (expectedDiagnostic.message) {
              matches = matches.filter((match) => {
                if (typeof expectedDiagnostic.message === 'string') {
                  return match.message === expectedDiagnostic.message
                }
                return expectedDiagnostic.message!.test(match.message)
              })
            }
            if (expectedDiagnostic.offset) {
              matches = matches.filter((match) => {
                const start = vscode.window.activeTextEditor!.document.offsetAt(
                  match.range.start
                )
                return start === expectedDiagnostic.offset
              })
            }
            if (expectedDiagnostic.length) {
              matches = matches.filter((match) => {
                const start = vscode.window.activeTextEditor!.document.offsetAt(
                  match.range.start
                )
                const end = vscode.window.activeTextEditor!.document.offsetAt(
                  match.range.end
                )
                return end - start === expectedDiagnostic.length
              })
            }
            if (matches.length === 0) {
              passedTime += pollingInterval
              await new Promise((resolve) =>
                setTimeout(resolve, pollingInterval)
              )
              continue
            } else {
              success = true
              break outer
            }
          }
        }
        passedTime += pollingInterval
        await new Promise((resolve) => setTimeout(resolve, pollingInterval))
      }
      if (!success) {
        console.log(JSON.stringify(testCase.expectDiagnostics))
        console.log(JSON.stringify(diagnostics))
        throw new Error('diagnostics do not match')
      }
    }
  }
}

// export const slowSpeed = 30

// export const slowTimeout = 200
export const slowSpeed = 50

export const slowTimeout = 1750
