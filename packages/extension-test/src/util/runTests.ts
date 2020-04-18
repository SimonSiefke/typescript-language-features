import * as fs from 'fs-extra'
import * as path from 'path'
import { downloadAndUnzipVSCode, runTests as _runTests } from 'vscode-test'

const VSCODE_VERSION = '1.44.2'

export interface Test {
  readonly path: string
  readonly only?: boolean
  readonly skip?: boolean
  readonly enableExtensions?: boolean
}

const runTest = async (test: Test, dirname: string) => {
  try {
    const root = path.join(dirname, '../../../')
    const extensionDevelopmentPath = path.join(root, 'packages/extension')
    const testWorkspaceName = test.path.includes('/')
      ? test.path.split('/')[test.path.split('/').length - 1]
      : test.path
    const workspacePathSrc = path.join(
      dirname.replace('dist', 'src'),
      `${test.path}/${testWorkspaceName}-workspace`
    )
    const workspacePathDist = path.join(
      dirname,
      `${test.path}/${testWorkspaceName}-workspace-dist`
    )
    await fs.copy(workspacePathSrc, workspacePathDist)
    const extensionTestsPath = path.join(dirname, test.path, 'run.js')
    const vscodeExecutablePath = await downloadAndUnzipVSCode(VSCODE_VERSION)
    if (
      fs.existsSync(
        path.join(
          path.dirname(vscodeExecutablePath),
          'resources/app/extensions/typescript-language-features'
        )
      )
    ) {
      fs.removeSync(
        path.join(
          path.dirname(vscodeExecutablePath),
          'resources/app/extensions/typescript-language-features'
        )
      )
    }
    console.log(vscodeExecutablePath)
    const launchArgs: string[] = ['--disable-extensions', workspacePathDist]
    await _runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
      extensionTestsEnv: {
        extensionPath: extensionDevelopmentPath,
        NODE_ENV: 'test',
      },
    })
  } catch (err) {
    console.error(err)
    console.error('Failed to run tests')
    process.exit(1)
  }
}

export const runTests = async (tests: readonly Test[], dirname: string) => {
  const onlyTest = tests.find((test) => test.only)
  if (onlyTest) {
    await runTest(onlyTest, dirname)
    return
  }
  for (const test of tests) {
    if (test.skip) {
      continue
    }
    await runTest(test, dirname)
  }
}
