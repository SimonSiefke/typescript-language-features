/// <reference no-default-lib="true"/>

interface Array<T> {
  /**
   * Determines whether an array includes a certain element, returning true or false as appropriate.
   * @param searchElement The element to search for.
   */
  includes(searchElement: T): boolean
}
