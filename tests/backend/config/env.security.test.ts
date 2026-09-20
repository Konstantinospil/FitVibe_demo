import { generateKeyPairSync } from "node:crypto";

describe("environment security configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY_PATH = "/definitely/missing/private.pem";
    process.env.JWT_PUBLIC_KEY_PATH = "/definitely/missing/public.pem";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects production startup without persistent JWT keys", async () => {
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;

    await expect(import("../../../apps/backend/src/config/env.js")).rejects.toThrow(
      "Production requires persistent JWT signing keys",
    );
  });

  it("derives the public key when only a valid private key is configured", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    process.env.JWT_PRIVATE_KEY = privateKey;
    delete process.env.JWT_PUBLIC_KEY;

    const { RSA_KEYS } = await import("../../../apps/backend/src/config/env.js");

    expect(RSA_KEYS.privateKey).toContain("PRIVATE KEY");
    expect(RSA_KEYS.publicKey).toContain("PUBLIC KEY");
  });

  it("rejects mismatched JWT key pairs", async () => {
    const first = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const second = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    process.env.JWT_PRIVATE_KEY = first.privateKey;
    process.env.JWT_PUBLIC_KEY = second.publicKey;

    await expect(import("../../../apps/backend/src/config/env.js")).rejects.toThrow(
      "do not form a matching key pair",
    );
  });
});
