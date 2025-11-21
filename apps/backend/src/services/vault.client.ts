export interface VaultClientOptions {
  endpoint: string;
  token: string;
  namespace?: string;
  timeoutMs?: number;
}

export class VaultClient {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly namespace?: string;
  private readonly timeoutMs: number;

  constructor(options: VaultClientOptions) {
    if (!options.endpoint) {
      throw new Error("Vault endpoint is required");
    }
    if (!options.token) {
      throw new Error("Vault token is required");
    }

    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.token = options.token;
    this.namespace = options.namespace;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  async read<T = unknown>(path: string): Promise<T | null> {
    const response = await this.request(path, { method: "GET" }, { allowNotFound: true });
    return response as T | null;
  }

  async write(path: string, data: Record<string, unknown>): Promise<void> {
    await this.request(
      path,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "content-type": "application/json",
        },
      },
      { expectBody: false },
    );
  }

  async health(): Promise<unknown> {
    return this.request("/sys/health", { method: "GET" });
  }

  private async request(
    path: string,
    init: RequestInit,
    options: { allowNotFound?: boolean; expectBody?: boolean } = {},
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = new Headers(init.headers ?? {});
      headers.set("x-vault-token", this.token);
      headers.set("accept", "application/json");
      if (this.namespace) {
        headers.set("x-vault-namespace", this.namespace);
      }

      const response = await fetch(this.buildUrl(path), {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (response.status === 404 && options.allowNotFound) {
        return null;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = new Error(
          `Vault request failed: ${response.status} ${response.statusText}${
            text ? ` - ${text}` : ""
          }`,
        );
        throw error;
      }

      if (response.status === 204 || options.expectBody === false) {
        return null;
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return response.json();
      }

      return response.text();
    } catch (error) {
      // Re-throw abort errors with a clearer message
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Vault request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string): string {
    const normalized = path.replace(/^\//, "");
    return `${this.endpoint}/v1/${normalized}`;
  }
}

export function createVaultClient(options: VaultClientOptions): VaultClient {
  return new VaultClient(options);
}
