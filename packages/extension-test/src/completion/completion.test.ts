import {
  activateExtension,
  createTestFile,
  run,
  TestCase,
} from '../util/test-utils'

describe('completion', () => {
  before(async () => {
    await createTestFile('completion.vue')
    await activateExtension()
  })
  it.skip('global snippets', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: '',
        type: 'template',
        expect: `<template>
  |
</template>`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
      {
        input: `<template>

</template>

|`,
        type: 'scr',
        expect: `<template>

</template>

<script>
export default {
  |
}
</script>`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
      {
        input: `<template>

</template>

<script>
export default {

}
</script>

|`,
        type: 'sty',
        expect: `<template>

</template>

<script>
export default {

}
</script>

<style>
|
</style>`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
    ]
    await run(testCases, {})
  })

  //   it.only('autocompletion in html', async () => {
  //     const testCases: readonly TestCase[] = [
  //       {
  //         input: `<template>
  // <input|
  // </template>`,
  //         type: ' /',
  //         expect: `<template>
  // <input />
  // </template>`,
  //       },
  //       {
  //         input: `<template>
  // <input|
  // </template>`,
  //         type: '/',
  //         expect: `<template>
  // <input/>
  // </template>`,
  //       },
  //       {
  //         input: `<template>
  // <input disabled|
  // </template>`,
  //         type: '/',
  //         expect: `<template>
  // <input disabled/>
  // </template>`,
  //       },
  //     ]
  //     await run(testCases, {})
  //   })

  it('inside template', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: `<template>
  <|
</template>`,
        type: 'h',
        expect: `<template>
  <h1
</template>`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
    ]
    await run(testCases, {})
  })

  it.skip('autocompletion in script', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: `<script lang="ts">
|
</script>`,
        type: 'Arr',
        expect: `<script lang="ts">
Array
</script>`,
        afterTypeCommands: [
          'editor.action.triggerSuggest',
          'acceptSelectedSuggestion',
        ],
      },
    ]
    await run(testCases, {})
  })
})
