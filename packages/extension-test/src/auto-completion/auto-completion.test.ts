import {
  createTestFile,
  activateExtension,
  TestCase,
  run,
} from '../util/test-utils'

describe('auto-completion', () => {
  before(async () => {
    await createTestFile('auto-completion.vue')
    await activateExtension()
  })
  it('self-closing tag', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: `<template>
  <input|
</template>`,
        type: '/',
        expect: `<template>
  <input/>
</template>`,
      },
    ]
    await run(testCases, {})
  })

  it('auto class id', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: `<template>
  <input|
</template>`,
        type: '.',
        expect: `<template>
  <input class="|"
</template>`,
      },
      {
        input: `<template>
  <input|
</template>`,
        type: '#',
        expect: `<template>
  <input id="|"
</template>`,
      },
    ]
    await run(testCases)
  })

  it('auto close tag', async () => {
    const testCases: readonly TestCase[] = [
      {
        input: `<template>
  <div><|
</template>`,
        type: '/',
        expect: `<template>
  <div></div>
</template>`,
      },
      {
        input: `<template>
  <div|
</template>`,
        type: '>',
        expect: `<template>
  <div></div>
</template>`,
      },
    ]
    await run(testCases)
  })
})
