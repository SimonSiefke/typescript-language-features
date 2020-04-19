/// <reference no-default-lib="true"/>

interface Array<T> {
  /**
   * Gets the length of the array. This is a number one higher than the highest element defined in an array.
   */
  readonly length: number

  /**
   * Calls a defined callback function on each element of an array, and returns an array that contains the results.
   * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
   */
  readonly map: <U>(callbackfn: (value: T) => U) => readonly U[]
  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
   */
  readonly filter: <S extends T>(
    callbackfn: (value: T) => value is S
  ) => readonly S[]

  readonly [n: number]: T
}

interface Math {
  /** The mathematical constant e. This is Euler's number, the base of natural logarithms. */
  readonly E: number
  /** Pi. This is the ratio of the circumference of a circle to its diameter. */
  readonly PI: number
  /**
   * Returns the absolute value of a number (the value without regard to whether it is positive or negative).
   * For example, the absolute value of -5 is the same as the absolute value of 5.
   * @param x A numeric expression for which the absolute value is needed.
   */
  readonly abs: (x: number) => number
  /**
   * Returns the smallest integer greater than or equal to its numeric argument.
   * @param x A numeric expression.
   */
  readonly ceil: (x: number) => number
  /**
   * Returns the greatest integer less than or equal to its numeric argument.
   * @param x A numeric expression.
   */
  readonly floor: (x: number) => number
  /**
   * Returns the larger of a set of supplied numeric expressions.
   * @param values Numeric expressions to be evaluated.
   */
  readonly max: (...values: number[]) => number
  /**
   * Returns the smaller of a set of supplied numeric expressions.
   * @param values Numeric expressions to be evaluated.
   */
  readonly min: (...values: number[]) => number
  /** Returns a pseudorandom number between 0 and 1. */
  readonly random: () => number
  /**
   * Returns a supplied numeric expression rounded to the nearest integer.
   * @param x The value to be rounded to the nearest integer.
   */
  readonly round: (x: number) => number
}

/** An intrinsic object that provides basic mathematics functionality and constants. */
declare const Math: Math
