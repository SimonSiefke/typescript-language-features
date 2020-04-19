/// <reference no-default-lib="true"/>

/* @internal */
interface Console {
  readonly error:(...data: any[])=> void
  readonly log:(...data: any[])=> void
}

declare var console: {
  error(...data: any[]): void
  log(...data: any[]): void
}
