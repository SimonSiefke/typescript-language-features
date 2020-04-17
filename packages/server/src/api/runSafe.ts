import { handleError } from './errorHandlingAndLogging'

const measure = true
const measureLong = false

/**
 * Runs a synchronous handler
 */
export const runSafeSync: <Handler extends (...args: any[]) => any>(
  handler: Handler,
  handlerName?: string
) => (...args: Parameters<Handler>) => ReturnType<Handler> = (
  handler,
  handlerName = 'handler'
) => (...params) => {
  try {
    const NS_PER_MS = 1e6
    const NS_PER_SEC = 1e9
    const start = process.hrtime()
    const result = handler(...params)
    const elapsedTime = process.hrtime(start)
    const elapsedTimeMs =
      (elapsedTime[0] * NS_PER_SEC + elapsedTime[1]) / NS_PER_MS
    if (measure) {
      console.log(`${handlerName} took: ${elapsedTimeMs}ms`)
    }
    const maxAllowedTime = 1.35
    if (measureLong && elapsedTimeMs > maxAllowedTime && measure) {
      console.error(`${handlerName} took: ${elapsedTimeMs}ms`)
    }
    return result
  } catch (error) {
    handleError(error)
  }
}

/**
 * Runs an asynchronous handler
 */
export const runSafeAsync: <
  T,
  Handler extends (...args: any[]) => T | Promise<T>
>(
  handler: Handler,
  handlerName?: string
) => (...args: Parameters<Handler>) => Promise<T> = (
  handler,
  handlerName = 'handler'
) => async (...params) => {
  try {
    const NS_PER_MS = 1e6
    const NS_PER_SEC = 1e9
    const start = process.hrtime()
    const result = await handler(...params)
    const elapsedTime = process.hrtime(start)
    const elapsedTimeMs =
      (elapsedTime[0] * NS_PER_SEC + elapsedTime[1]) / NS_PER_MS
    if (measure) {
      console.log(`${handlerName} took: ${elapsedTimeMs}ms`)
    }
    const maxAllowedTime = 1.35
    if (measureLong && elapsedTimeMs > maxAllowedTime && measure) {
      console.error(`${handlerName} took: ${elapsedTimeMs}ms`)
    }
    return result
  } catch (error) {
    console.log(`an error occurred when calling ${handlerName}`)
    handleError(error)
    return undefined as any
  }
}
