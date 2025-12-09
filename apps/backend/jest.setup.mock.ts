// Mock dotenv before any modules are loaded
// This must run in setupFiles (not setupFilesAfterEnv) to work with compiled JS files
jest.mock("dotenv", () => ({
  config: jest.fn(),
  default: {
    config: jest.fn(),
  },
}));

// Mock uuid to avoid ESM module issues in Jest
// uuid v13+ is ESM-only, so we provide a CommonJS-compatible mock
jest.mock("uuid", () => {
  // Simple mock that generates UUIDs using crypto (available in Node.js)
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const crypto = require("crypto");
  return {
    v4: (): string => {
      // Generate a proper UUID v4
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const bytes = crypto.randomBytes(16);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
      return [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        bytes.toString("hex", 0, 4),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        bytes.toString("hex", 4, 6),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        bytes.toString("hex", 6, 8),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        bytes.toString("hex", 8, 10),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        bytes.toString("hex", 10, 16),
      ].join("-");
    },
  };
});
