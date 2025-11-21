import { createVaultClient, VaultClient } from "../vault.client";

const originalFetch = global.fetch;
let fetchMock: jest.MockedFunction<typeof fetch>;

describe("VaultClient", () => {
  beforeEach(() => {
    fetchMock = jest.fn();
    (global as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    (global as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch;
  });

  const buildResponse = (body: BodyInit | null, init: ResponseInit) => new Response(body, init);

  it("requires both endpoint and token", () => {
    expect(() => new VaultClient({ endpoint: "", token: "" as unknown as string })).toThrow(
      "Vault endpoint is required",
    );
    expect(() => new VaultClient({ endpoint: "https://vault.local", token: "" })).toThrow(
      "Vault token is required",
    );
  });

  it("reads JSON secrets with the correct headers", async () => {
    fetchMock.mockResolvedValueOnce(
      buildResponse(JSON.stringify({ data: { password: "secret" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = createVaultClient({
      endpoint: "https://vault.local/",
      token: "vault-token",
      namespace: "devops",
    });

    const result = await client.read<{ data: { password: string } }>("/secret/data/app");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://vault.local/v1/secret/data/app",
      expect.objectContaining({ method: "GET" }),
    );
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("x-vault-token")).toBe("vault-token");
    expect(headers.get("x-vault-namespace")).toBe("devops");
    expect(headers.get("accept")).toBe("application/json");
    expect(result).toEqual({ data: { password: "secret" } });
  });

  it("returns null when a secret is not found", async () => {
    fetchMock.mockResolvedValueOnce(buildResponse("", { status: 404, statusText: "Not Found" }));

    const client = createVaultClient({ endpoint: "https://vault.local", token: "vault-token" });

    await expect(client.read("secret/data/missing")).resolves.toBeNull();
  });

  it("writes secrets with JSON payload without expecting a response body", async () => {
    fetchMock.mockResolvedValueOnce(buildResponse(null, { status: 204 }));

    const client = createVaultClient({ endpoint: "https://vault.local", token: "vault-token" });

    await client.write("secret/data/app", { data: { password: "updated" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://vault.local/v1/secret/data/app",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ data: { password: "updated" } }),
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("exposes the health endpoint via helper method", async () => {
    fetchMock.mockResolvedValueOnce(
      buildResponse("ok", { status: 200, headers: { "content-type": "text/plain" } }),
    );

    const client = createVaultClient({ endpoint: "https://vault.local", token: "vault-token" });

    await expect(client.health()).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vault.local/v1/sys/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws a descriptive error when Vault responds with failure", async () => {
    fetchMock.mockResolvedValueOnce(
      buildResponse("boom", { status: 500, statusText: "Internal Server Error" }),
    );

    const client = createVaultClient({ endpoint: "https://vault.local", token: "vault-token" });

    await expect(client.read("secret/data/app")).rejects.toThrow(
      "Vault request failed: 500 Internal Server Error - boom",
    );
  });
});
