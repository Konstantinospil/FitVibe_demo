import {
  decryptTotpSecret,
  encryptTotpSecret,
  isEncryptedTotpSecret,
} from "../../../../apps/backend/src/modules/auth/totp-secret.crypto.js";

describe("TOTP secret encryption", () => {
  it("encrypts with an authenticated envelope and round-trips", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptTotpSecret(secret);

    expect(encrypted).not.toContain(secret);
    expect(isEncryptedTotpSecret(encrypted)).toBe(true);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  it("rejects plaintext secret values", () => {
    expect(() => decryptTotpSecret("JBSWY3DPEHPK3PXP")).toThrow(
      "Refusing to use an unencrypted TOTP secret",
    );
  });

  it("detects ciphertext tampering", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const tampered = encrypted.slice(0, -1) + (encrypted.endsWith("A") ? "B" : "A");

    expect(() => decryptTotpSecret(tampered)).toThrow();
  });
});
