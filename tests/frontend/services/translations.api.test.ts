import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTranslation,
  deleteTranslation,
  getTranslationMetadata,
  getTranslations,
  listTranslations,
  updateTranslation,
} from "../../src/services/translations.api";
import { apiClient } from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("translations.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches translations with namespace", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { key: "value" } });
    const result = await getTranslations("en", "common");

    expect(apiClient.get as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "/api/v1/translations/en",
      { params: { namespace: "common" } },
    );
    expect(result).toEqual({ key: "value" });
  });

  it("lists translations with params", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [], pagination: { total: 0, limit: 10, offset: 0 } },
    });
    await listTranslations({ search: "home" });

    expect(apiClient.get as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("/api/v1/translations", {
      params: { search: "home" },
    });
  });

  it("gets translation metadata", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { languages: ["en"], namespaces: ["common"] } },
    });
    const result = await getTranslationMetadata();

    expect(apiClient.get as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "/api/v1/translations/metadata",
    );
    expect(result.data.languages).toContain("en");
  });

  it("creates and updates translations", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: "1" } });
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: "1" } });

    await createTranslation({
      namespace: "common",
      key_path: "home",
      language: "en",
      value: "Home",
    });
    await updateTranslation("en", "common", "home.key", { value: "New" });

    expect(apiClient.post as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "/api/v1/translations",
      { namespace: "common", key_path: "home", language: "en", value: "Home" },
    );
    expect(apiClient.put as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "/api/v1/translations/en/common/home.key",
      { value: "New" },
    );
  });

  it("deletes translation with encoded key path", async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await deleteTranslation("en", "common", "errors.notFound");
    expect(apiClient.delete as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "/api/v1/translations/en/common/errors.notFound",
    );
  });
});
