import { activateExtension, createTestFile, run, TestCase } from '../util/test-utils'

describe('completion', () => {
  before(async () => {
    await createTestFile('completion.ts')
    await activateExtension()
  })
  it('basic', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: '',
        type: 'Array.fro',
        expect: `Array.from(arrayLike)`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
    ]
    await run(testCases, {})
  })
})
