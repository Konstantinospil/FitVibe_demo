export {};

const envMock = { NODE_ENV: "test", token: "env" };
const rsaKeysMock = { privateKey: "priv", publicKey: "pub" };
const jwksMock = { keys: [{ kty: "RSA" }] };
const loggerMock = { info: jest.fn(), error: jest.fn() };

jest.mock("../env.js", () => ({
  env: envMock,
  RSA_KEYS: rsaKeysMock,
  JWKS: jwksMock,
}));

jest.mock("../logger.js", () => ({
  logger: loggerMock,
}));

describe("config/index re-exports", () => {
  it("exposes env constants from env module", async () => {
    const module = await import("../index");

    expect(module.env).toBe(envMock);
    expect(module.RSA_KEYS).toBe(rsaKeysMock);
    expect(module.JWKS).toBe(jwksMock);
  });

  it("re-exports the logger instance", async () => {
    const module = await import("../index");

    expect(module.logger).toBe(loggerMock);
  });
});
