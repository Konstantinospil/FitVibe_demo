export {};

const envMock = { NODE_ENV: "test", token: "env" };
const rsaKeysMock = { privateKey: "priv", publicKey: "pub" };
const jwksMock = { keys: [{ kty: "RSA" }] };
const loggerMock = { info: jest.fn(), error: jest.fn() };

jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: envMock,
  RSA_KEYS: rsaKeysMock,
  JWKS: jwksMock,
}));

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: loggerMock,
}));

describe("config/index re-exports", () => {
  it("exposes env constants from env module", async () => {
    const module = await import("../../../apps/backend/src/config/index.js");

    expect(module.env).toBe(envMock);
    expect(module.RSA_KEYS).toBe(rsaKeysMock);
    expect(module.JWKS).toBe(jwksMock);
  });

  it("re-exports the logger instance", async () => {
    const module = await import("../../../apps/backend/src/config/index.js");

    expect(module.logger).toBe(loggerMock);
  });
});
