/**
 * Type declarations for @jest/globals
 * Jest 29+ exports these from the jest package itself
 */
declare module "@jest/globals" {
  import type * as jest from "jest";

  export const describe: jest.Describe;
  export const it: jest.It;
  export const test: jest.It;
  export const expect: jest.Expect;
  export const beforeEach: jest.Lifecycle;
  export const afterEach: jest.Lifecycle;
  export const beforeAll: jest.Lifecycle;
  export const afterAll: jest.Lifecycle;
  export const jest: typeof jest;
}

