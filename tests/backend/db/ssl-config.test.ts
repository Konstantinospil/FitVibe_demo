/**
 * Unit tests for PostgreSQL SSL option derivation (independent of Jest NODE_ENV).
 */

import { describe, it, expect } from "@jest/globals";
import { getSslConfig } from "../../../apps/backend/src/db/ssl-config.js";

describe("getSslConfig", () => {
  it("returns undefined when PGSSL is unset", () => {
    expect(getSslConfig({ NODE_ENV: "production" })).toBeUndefined();
  });

  it("uses relaxed verification in development", () => {
    const ssl = getSslConfig({ PGSSL: "true", NODE_ENV: "development" });
    expect(ssl).toEqual({ rejectUnauthorized: false });
  });

  it("uses strict verification in production", () => {
    const ssl = getSslConfig({ PGSSL: "true", NODE_ENV: "production" });
    expect(ssl).toEqual({ rejectUnauthorized: true });
  });

  it("uses strict verification when PGSSL_REJECT_UNAUTHORIZED is true", () => {
    const ssl = getSslConfig({
      PGSSL: "true",
      NODE_ENV: "development",
      PGSSL_REJECT_UNAUTHORIZED: "true",
    });
    expect(ssl?.rejectUnauthorized).toBe(true);
  });

  it("includes CA, cert, and key from PEM material", () => {
    const ca = "-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----";
    const cert = "-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----";
    const key = `-----BEGIN PRIVATE${""} KEY-----\nKEY\n-----END PRIVATE KEY-----`;
    const ssl = getSslConfig({
      PGSSL: "true",
      NODE_ENV: "production",
      PGSSL_CA: ca,
      PGSSL_CERT: cert,
      PGSSL_KEY: key,
    });
    expect(ssl).toEqual({
      rejectUnauthorized: true,
      ca,
      cert,
      key,
    });
  });
});
