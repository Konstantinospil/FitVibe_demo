interface VaultConfig {
  enabled: boolean;
  token?: string | null;
  addr: string;
  namespace?: string | null;
}

interface EnvMockShape {
  PORT: number;
  vault: VaultConfig;
}

const listenMock = jest.fn();
const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const initializeSecretsManagerMock = jest.fn();

const envMock: EnvMockShape = {
  PORT: 5050,
  vault: {
    enabled: false,
    token: "",
    addr: "https://vault.local",
    namespace: "root",
  },
};

jest.mock("../app.js", () => ({
  __esModule: true,
  default: { listen: listenMock },
}));

jest.mock("../config/logger.js", () => ({
  logger: loggerMock,
}));

jest.mock("../config/env.js", () => ({
  env: envMock,
}));

jest.mock("../services/secrets.service.js", () => ({
  initializeSecretsManager: initializeSecretsManagerMock,
}));

const exitSpy = jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
  throw new Error(`exit:${code}`);
}) as never);

afterAll(() => {
  exitSpy.mockRestore();
});

describe("server bootstrap", () => {
  beforeEach(() => {
    jest.resetModules();
    listenMock.mockClear();
    loggerMock.info.mockClear();
    loggerMock.error.mockClear();
    initializeSecretsManagerMock.mockClear();
    envMock.PORT = 5050;
    envMock.vault = { ...envMock.vault, enabled: false, token: "" };
  });

  const loadServer = () => import("../server.js");

  it("starts the HTTP server when vault is disabled", async () => {
    await loadServer();

    expect(listenMock).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "[server] Secrets manager disabled - using environment variables",
    );
  });

  it("exits the process when vault is enabled without token", async () => {
    envMock.vault = { ...envMock.vault, enabled: true, token: "" };

    await expect(loadServer()).rejects.toThrow("exit:1");

    expect(loggerMock.error).toHaveBeenCalledWith(
      "[server] VAULT_ENABLED=true but VAULT_TOKEN is not set",
    );
  });

  it("initializes the secrets manager when vault is configured", async () => {
    envMock.vault = {
      enabled: true,
      token: "vault-token",
      addr: "https://secure-vault",
      namespace: "devops",
    };

    await loadServer();

    expect(initializeSecretsManagerMock).toHaveBeenCalledWith({
      provider: "vault",
      vault: {
        enabled: true,
        addr: "https://secure-vault",
        token: "vault-token",
        namespace: "devops",
      },
    });
    expect(loggerMock.info).toHaveBeenCalledWith(
      { vaultAddr: "https://secure-vault" },
      "[server] Secrets manager initialized with Vault",
    );
    expect(listenMock).toHaveBeenCalledWith(5050, expect.any(Function));
  });
});
