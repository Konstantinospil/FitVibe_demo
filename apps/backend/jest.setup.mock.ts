// Mock dotenv before any modules are loaded
// This must run in setupFiles (not setupFilesAfterEnv) to work with compiled JS files
jest.mock("dotenv", () => ({
  config: jest.fn(),
  default: {
    config: jest.fn(),
  },
}));
