import { runTests } from './util/runTests'

runTests(
  [
    // {
    //   path: 'basic',
    // },
    {
      path: 'auto-completion',
      skip: true,
    },
    {
      path: 'completion',
    },
  ],
  __dirname
)
