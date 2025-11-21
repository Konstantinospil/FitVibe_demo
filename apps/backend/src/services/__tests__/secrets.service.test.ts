export {};

const sendMock = jest.fn();
const secretsManagerClientMock = jest.fn(() => ({ send: sendMock }));
const getSecretValueCommandMock = jest.fn((input: { SecretId: string }) => ({ input }));
const vaultClientMock = {
  read: jest.fn(),
  write: jest.fn(),
  health: jest.fn(),
};
const loggerMock: Record<"info" | "warn" | "error", jest.Mock> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const createVaultClientMock = jest.fn(() => vaultClientMock);

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: secretsManagerClientMock,
  GetSecretValueCommand: getSecretValueCommandMock,
}));

jest.mock("../../config/logger.js", () => ({
  logger: loggerMock,
}));

jest.mock("../vault.client.js", () => ({
  createVaultClient: createVaultClientMock,
}));

async function loadSecretsService() {
  return import("../secrets.service");
}

describe("secrets.service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    sendMock.mockReset();
    secretsManagerClientMock.mockClear();
    getSecretValueCommandMock.mockClear();
    createVaultClientMock.mockClear();
    vaultClientMock.read.mockReset();
    vaultClientMock.write.mockReset();
    vaultClientMock.health.mockReset();
  });

  it("logs an error when getSecret is called before initialization", async () => {
    const { getSecret } = await loadSecretsService();

    await expect(getSecret("secret-key")).resolves.toBeNull();
    expect(loggerMock.error).toHaveBeenCalledWith("[secrets] Secrets manager not initialized");
  });

  it("reads secrets from Vault KV data when configured", async () => {
    const { initializeSecretsManager, getSecret } = await loadSecretsService();
    vaultClientMock.read.mockResolvedValue({
      data: { data: { private: "super-secret" } },
    });

    initializeSecretsManager({
      provider: "vault",
      vault: {
        enabled: true,
        addr: "http://vault:8200",
        token: "vault-token",
      },
    });

    const value = await getSecret("secret/jwt", "private");

    expect(createVaultClientMock).toHaveBeenCalledWith({
      endpoint: "http://vault:8200",
      token: "vault-token",
      namespace: undefined,
    });
    expect(vaultClientMock.read).toHaveBeenCalledWith("secret/jwt");
    expect(value).toBe("super-secret");
  });

  it("falls back to AWS Secrets Manager when configured", async () => {
    const { initializeSecretsManager, getSecret } = await loadSecretsService();
    sendMock.mockResolvedValue({
      SecretString: JSON.stringify({ url: "postgres://db" }),
    });

    initializeSecretsManager({
      provider: "aws",
      aws: {
        enabled: true,
        region: "us-west-2",
      },
    });

    const value = await getSecret("secret/database", "url");

    expect(secretsManagerClientMock).toHaveBeenCalledWith({ region: "us-west-2" });
    expect(getSecretValueCommandMock).toHaveBeenCalledWith({ SecretId: "secret/database" });
    expect(sendMock).toHaveBeenCalled();
    expect(value).toBe("postgres://db");
  });

  it("writes secrets to Vault and normalizes string payloads", async () => {
    const { initializeSecretsManager, writeSecret } = await loadSecretsService();
    vaultClientMock.write.mockResolvedValue(undefined);

    initializeSecretsManager({
      provider: "vault",
      vault: {
        enabled: true,
        addr: "http://vault:8200",
        token: "vault-token",
      },
    });

    const result = await writeSecret("secret/jwt", "private-key");

    expect(result).toBe(true);
    expect(vaultClientMock.write).toHaveBeenCalledWith("secret/jwt", { value: "private-key" });
    expect(loggerMock.info).toHaveBeenCalledWith(
      { key: "secret/jwt" },
      "[secrets] Secret written to Vault",
    );
  });

  it("returns null when JWT keys are missing", async () => {
    const service = await loadSecretsService();
    const getSecretSpy = jest
      .spyOn(service, "getSecret")
      .mockResolvedValueOnce("private")
      .mockResolvedValueOnce(null);

    await expect(service.getJWTKeys()).resolves.toBeNull();
    expect(loggerMock.warn).toHaveBeenCalledWith("[secrets] JWT keys not found in secrets manager");
    getSecretSpy.mockRestore();
  });

  it("reports Vault health status", async () => {
    const { initializeSecretsManager, checkSecretsHealth } = await loadSecretsService();
    vaultClientMock.health.mockResolvedValue(undefined);

    initializeSecretsManager({
      provider: "vault",
      vault: {
        enabled: true,
        addr: "http://vault:8200",
        token: "vault-token",
      },
    });

    await expect(checkSecretsHealth()).resolves.toBe(true);
    expect(vaultClientMock.health).toHaveBeenCalled();
  });
});
