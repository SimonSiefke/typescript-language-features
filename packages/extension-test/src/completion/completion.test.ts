import {
  activateExtension,
  createTestFile,
  run,
  TestCase,
} from '../util/test-utils'

describe('completion', () => {
  before(async () => {
    await createTestFile('completion.ts')
    await activateExtension()
  })
  it('basic', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: '',
        type: `let x = []
x.m`,
        expect: `let x = []
x.map(callbackfn)`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
    ]
    await run(testCases, {})
  })
})
